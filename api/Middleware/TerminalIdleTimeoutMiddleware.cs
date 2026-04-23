using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PreOrderApp.Data;
using PreOrderApp.Services;
using PreOrderApp.Services.Interfaces;
using PreOrderApp.Models;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

namespace PreOrderApp.Middleware;

/// <summary>
/// Middleware to check for idle terminals and auto-lock them after inactivity timeout.
/// 
/// How it works:
/// 1. On each request, check if the user has a locked terminal
/// 2. If terminal is locked, check if it has exceeded the idle timeout threshold
/// 3. If idle timeout exceeded, forcefully lock the terminal and logout the user
/// 4. Otherwise, update the LastActivityOn timestamp
/// 
/// This ensures that terminals left unattended are automatically locked for security.
/// </summary>
public class TerminalIdleTimeoutMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TerminalIdleTimeoutMiddleware> _logger;
    private readonly IConfiguration _configuration;

    public TerminalIdleTimeoutMiddleware(RequestDelegate next, ILogger<TerminalIdleTimeoutMiddleware> logger, IConfiguration configuration)
    {
        _next = next;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task InvokeAsync(
        HttpContext context,
        AppDbContext dbContext,
        ITerminalLockService terminalLockService,
        IAuthService authService)
    {
        try
        {
            // Skip idle check for:
            // - Login/registration endpoints (unauthenticated users)
            // - Refresh-token endpoint (CRITICAL: must work even when session idle)
            // - Terminal lookup endpoints (called immediately after login)
            // - Health/swagger endpoints
            var path = context.Request.Path.ToString().ToLower();
            
            // CRITICAL: Refresh-token MUST bypass idle timeout check - it's the recovery mechanism
            if (path.StartsWith("/api/auth/refresh-token"))
            {
                _logger.LogDebug("[TerminalIdleTimeout] BYPASS: Refresh-token endpoint - session recovery allowed");
                await _next(context);
                return;
            }
            
            // CRITICAL: PIN users endpoint MUST bypass idle timeout check
            // This endpoint is called AFTER refresh-token succeeds to load org's PIN users
            // It's part of the idle timeout recovery flow (refresh → load users → PIN signin)
            if (path.StartsWith("/api/auth/pin-users"))
            {
                _logger.LogDebug("[TerminalIdleTimeout] BYPASS: PIN users endpoint - part of idle recovery flow");
                await _next(context);
                return;
            }
            
            if (path.StartsWith("/api/auth/login") || 
                path.StartsWith("/api/auth/register") ||
                path.StartsWith("/api/auth/pin-login") ||
                path.StartsWith("/api/terminal") ||  // Skip terminal lookups called right after login
                path.StartsWith("/api/terminals") ||  // Skip terminals list endpoint
                path.StartsWith("/api/health") || 
                path.StartsWith("/swagger"))
            {
                await _next(context);
                return;
            }

            // Get the current user ID if authenticated
            var userIdStr = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) ||
                !Guid.TryParse(userIdStr, out var userId))
            {
                // User not authenticated, skip idle check
                await _next(context);
                return;
            }

            // Get organization ID from claims
            var orgIdStr = context.User.FindFirst("org_id")?.Value;
            if (string.IsNullOrEmpty(orgIdStr) || !Guid.TryParse(orgIdStr, out var organizationId))
            {
                await _next(context);
                return;
            }

            // Get terminal UID from claims (if present in JWT)
            var terminalIdStr = context.User.FindFirst("terminal_id")?.Value;
            Guid? terminalUid = null;
            if (!string.IsNullOrEmpty(terminalIdStr) && Guid.TryParse(terminalIdStr, out var parsedTerminalUid))
            {
                terminalUid = parsedTerminalUid;
            }

            // Get idle timeout configuration (default 30 minutes)
            var idleTimeoutMinutes = _configuration.GetValue<int>("Terminal:IdleTimeoutMinutes", 30);

            // Determine if this is a "background" request that shouldn't update activity time
            // (e.g., token refresh, heartbeat). These are automatic/periodic, not user-initiated.
            bool isBackgroundRequest = path.StartsWith("/api/auth/refresh-token") || 
                                       path.StartsWith("/api/auth/heartbeat");

            // Refresh token is fallback when jti is missing
            context.Request.Cookies.TryGetValue("refreshToken", out var refreshToken);
            // Extract identity anchors for precise session lookup
            var jtiClaim = context.User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value
                        ?? context.User.FindFirst("jti")?.Value;

            // Resolve the exact session (claim-first, then cookie)
            UserSession? currentSession = null;
            if (!string.IsNullOrWhiteSpace(jtiClaim) && Guid.TryParse(jtiClaim, out var sessionId))
            {
                // Primary lookup: JWT jti maps to UserSession.SessionId
                currentSession = dbContext.UserSessions
                    .FirstOrDefault(s => s.UserId == userId && s.SessionId == sessionId);

                if ((currentSession == null || !currentSession.IsActive || currentSession.ExpiresOn <= DateTime.UtcNow) &&
                    !string.IsNullOrWhiteSpace(refreshToken))
                {
                    // Fallback path: token jti may be stale while refresh cookie still maps to active session.
                    currentSession = dbContext.UserSessions
                        .FirstOrDefault(s => s.UserId == userId && s.SessionToken == refreshToken);
                }
            }
            else if (!string.IsNullOrWhiteSpace(refreshToken))
            {
                // Secondary lookup: refresh token cookie
                currentSession = dbContext.UserSessions
                    .FirstOrDefault(s => s.UserId == userId && s.SessionToken == refreshToken);
            }

            if (currentSession == null || !currentSession.IsActive || currentSession.ExpiresOn <= DateTime.UtcNow)
            {
                _logger.LogWarning(
                    "[SessionValidation] Invalid session. UserId={UserId}, Path={Path}, HasJti={HasJti}, HasRefreshCookie={HasRefreshCookie}",
                    userId,
                    path,
                    !string.IsNullOrWhiteSpace(jtiClaim),
                    !string.IsNullOrWhiteSpace(refreshToken));

                await WriteUnauthorizedAsync(context, "Terminal Idle Timeout killed due to session not valid", "session_invalid");
                return;
            }
            else
            {
                // Assign to non-nullable variable to satisfy compiler
                var session = currentSession;
                var timeSinceLastActivity = DateTime.UtcNow - session.LastAccessedOn;

                if (timeSinceLastActivity.TotalMinutes >= idleTimeoutMinutes)
                {
                    // This specific session has been idle too long
                    _logger.LogWarning(
                        "{ts}: User {UserId} in org {OrganizationId} exceeded idle timeout ({IdleMinutes} min). Session {SessionId} inactive since {LastAccessedOn}. Request: {Path}.",
                        DateTime.UtcNow,
                        userId,
                        organizationId,
                        idleTimeoutMinutes,
                        session.SessionId,
                        session.LastAccessedOn,
                        path);

                    // Block the request - idle timeout exceeded
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    context.Response.ContentType = "application/json";
                    
                    // Remove WWW-Authenticate header BEFORE writing response to prevent browser auth popup
                    if (context.Response.Headers.ContainsKey("WWW-Authenticate"))
                    {
                        context.Response.Headers.Remove("WWW-Authenticate");
                    }
                    
                    await context.Response.WriteAsJsonAsync(new
                    {
                        message = "Session expired due to inactivity",
                        reason = "idle_timeout"
                    });
                    return;
                }
                else if (!isBackgroundRequest)
                {
                    // Update ONLY this specific session's activity timestamp
                    // This ensures each terminal has independent idle timeouts
                    session.LastAccessedOn = DateTime.UtcNow;
                }
            }

            // Save any updated activity timestamps (only if not a background request)
            if (!isBackgroundRequest && currentSession is not null)
            {
                await dbContext.SaveChangesAsync();
            }

            // Continue to next middleware
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in TerminalIdleTimeoutMiddleware");
            // Don't fail the request if idle check fails
            await _next(context);
        }
    }
    private static async Task WriteUnauthorizedAsync(HttpContext context, string message, string reason)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        context.Response.ContentType = "application/json";

        if (context.Response.Headers.ContainsKey("WWW-Authenticate"))
        {
            context.Response.Headers.Remove("WWW-Authenticate");
        }

        await context.Response.WriteAsJsonAsync(new
        {
            message,
            reason
        });
    }    
}
