using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using PreOrderApp.Models;

namespace PreOrderApp.Filters;

/// <summary>
/// Authorization filter that restricts access to system admin roles for endpoints marked with [RequireSysAdmin].
///
/// Permitted roles:
///   - SystemAdmin  — system-wide administrator
///
/// This filter runs AFTER [Authorize] validation, so the user is already authenticated.
/// Regular users and staff are rejected with 403 Forbidden.
///
/// Usage: Apply [ValidateSysAdmin] to controllers or actions that should be admin-only.
/// </summary>
public class SysAdminFilter : IAsyncAuthorizationFilter
{
    private readonly ILogger<SysAdminFilter> _logger;

    public SysAdminFilter(ILogger<SysAdminFilter> logger)
    {
        _logger = logger;
    }

    public Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        // Only run for endpoints decorated with [ValidateSysAdmin]
        var hasAttribute = context.ActionDescriptor.EndpointMetadata
            .OfType<ValidateSysAdminAttribute>()
            .Any();

        if (!hasAttribute)
            return Task.CompletedTask;

        var user = context.HttpContext.User;

        var isAdmin = user.IsInRole(UserRoles.SystemAdmin);
        _logger.LogDebug(
            "SysAdminFilter executing for user {UserName}. IsAdmin: {IsAdmin}",
            user.Identity?.Name ?? "unknown",
            isAdmin);
        if (!isAdmin)
        {
            _logger.LogWarning(
                "System admin access denied: User {UserName} does not hold that role",
                user.Identity?.Name ?? "unknown");

            context.Result = new ObjectResult(new { message = "Admin role required" })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
        }
        else
        {
            _logger.LogDebug(
                "System admin access granted: User {UserName}",
                user.Identity?.Name ?? "unknown");
        }

        return Task.CompletedTask;
    }
}
