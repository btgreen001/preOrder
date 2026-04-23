using System.Text.Json;
using OrderMgmt.Services;

namespace OrderMgmt.Middleware;

/// <summary>
/// Middleware to enforce terminal locks
/// - Checks if requesting terminal is locked before allowing request
/// - Only applies to [Authorize] endpoints (authenticated requests)
/// - Skips [AllowAnonymous] endpoints (PIN signin, public endpoints)
/// - Returns 403 Forbidden if terminal is locked
/// </summary>
public class TerminalLockEnforcementMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TerminalLockEnforcementMiddleware> _logger;

    public TerminalLockEnforcementMiddleware(RequestDelegate next, ILogger<TerminalLockEnforcementMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, ITerminalLockService terminalLockService, IOrganizationContextService orgContext)
    {
        // Skip for unauthenticated requests
        if (context.User?.Identity?.IsAuthenticated != true)
        {
            await _next(context);
            return;
        }

        // Extract terminal ID from request headers or query string
        // Header takes precedence: X-Terminal-Id
        var terminalIdStr = context.Request.Headers["X-Terminal-Id"].FirstOrDefault() 
                         ?? context.Request.Query["terminalId"].FirstOrDefault();

        // If no terminal ID provided, allow request (some endpoints might not be terminal-specific)
        if (string.IsNullOrEmpty(terminalIdStr))
        {
            await _next(context);
            return;
        }

        // Skip PIN signin endpoints (they handle lock checking explicitly)
        if (context.Request.Path.StartsWithSegments("/api/auth/pin") || 
            context.Request.Path.StartsWithSegments("/api/pin"))
        {
            await _next(context);
            return;
        }

        try
        {
            // Parse terminal ID
            if (!long.TryParse(terminalIdStr, out var terminalId))
            {
                _logger.LogWarning("Invalid terminal ID format: {TerminalIdStr}", terminalIdStr);
                await _next(context);
                return;
            }

            // Get organization from JWT
            var organizationId = orgContext.GetCurrentOrganizationId();

            // Check if terminal is locked
            var isLocked = await terminalLockService.IsTerminalLockedAsync(organizationId, terminalId);

            if (isLocked)
            {
                _logger.LogWarning("Access denied: Terminal {TerminalId} is locked for org {OrgId}", terminalId, organizationId);
                
                // Get lock info for response
                var lockInfo = await terminalLockService.GetCurrentLockAsync(organizationId, terminalId);
                
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new
                {
                    message = "Terminal is locked",
                    locked = true,
                    lockedAt = lockInfo?.LockedAt,
                    lockedByUserId = lockInfo?.LockedByUserId,
                    error = "TERMINAL_LOCKED"
                });
                return;
            }

            // Terminal is not locked, allow request
            await _next(context);
        }
        catch (InvalidOperationException ex)
        {
            // Organization context missing (shouldn't happen for authenticated users)
            _logger.LogWarning(ex, "Error retrieving organization context for terminal lock check");
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking terminal lock in middleware");
            // Don't block request on error - fail open for reliability
            await _next(context);
        }
    }
}
