using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using PreOrderApp.Data;
using PreOrderApp.Models;

namespace PreOrderApp.Middleware;

public class SessionValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<SessionValidationMiddleware> _logger;

    public SessionValidationMiddleware(RequestDelegate next, ILogger<SessionValidationMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, AppDbContext dbContext)
    {
        try
        {
            var path = context.Request.Path.ToString().ToLowerInvariant();
            
            if (IsBypassedPath(path, context))
            {
                await _next(context);
                return;
            }

            if (!(context.User?.Identity?.IsAuthenticated ?? false))
            {
                await _next(context);
                return;
            }

            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                await WriteUnauthorizedAsync(context, "Missing or invalid user claim", "session_invalid");
                return;
            }

            // Refresh token is fallback when jti is missing
            context.Request.Cookies.TryGetValue("refreshToken", out var refreshToken);
            // Extract identity anchors for precise session lookup
            var jtiClaim = context.User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value
                        ?? context.User.FindFirst("jti")?.Value;

            UserSession? session = null;

            if (!string.IsNullOrWhiteSpace(jtiClaim) && Guid.TryParse(jtiClaim, out var sessionId))
            {
                session = await dbContext.UserSessions
                    .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.UserId == userId);

                if ((session == null || !session.IsActive || session.ExpiresOn <= DateTime.UtcNow) &&
                    !string.IsNullOrWhiteSpace(refreshToken))
                {
                    // Fallback path: token jti may be stale while refresh cookie still maps to active session.
                    session = await dbContext.UserSessions
                        .FirstOrDefaultAsync(s => s.UserId == userId && s.SessionToken == refreshToken);
                }
            }
            else if (!string.IsNullOrWhiteSpace(refreshToken))
            {
                session = await dbContext.UserSessions
                    .FirstOrDefaultAsync(s => s.UserId == userId && s.SessionToken == refreshToken);
            }

            if (session == null || !session.IsActive || session.ExpiresOn <= DateTime.UtcNow)
            {
                _logger.LogWarning(
                    "[SessionValidation] Invalid session. UserId={UserId}, Path={Path}, HasJti={HasJti}, HasRefreshCookie={HasRefreshCookie}",
                    userId,
                    path,
                    !string.IsNullOrWhiteSpace(jtiClaim),
                    !string.IsNullOrWhiteSpace(refreshToken));

                await WriteUnauthorizedAsync(context, "Session is no longer valid", "session_invalid");
                return;
            }
            else
            {
                session.LastAccessedOn = DateTime.UtcNow;
                await dbContext.SaveChangesAsync();
            }
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in SessionValidationMiddleware");
            throw;
        }
    }

    private static bool IsBypassedPath(string path, HttpContext context)
    {

        var endpoint = context.GetEndpoint();
        if (endpoint?.Metadata.GetMetadata<AllowAnonymousAttribute>() != null)
        {
            return true;
        }

        return path == "/" ||
               path.StartsWith("/health") ||
               path.StartsWith("/ping") ||
               path.StartsWith("/swagger") ||
               path.StartsWith("/api/health") ||
               path.StartsWith("/api/auth/login") ||
               path.StartsWith("/api/auth/pin-login") ||
               path.StartsWith("/api/auth/pin-users") ||
               path.StartsWith("/api/auth/register") ||
               path.StartsWith("/api/auth/check-username") ||
               path.StartsWith("/api/auth/refresh-token") ||
               path.StartsWith("/api/public/preorders") ||
               (path.StartsWith("/api/orders/") && path.EndsWith("/pickup-slot"));
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
