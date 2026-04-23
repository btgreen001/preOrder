using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using OrderMgmt.Models;

namespace OrderMgmt.Filters;

/// <summary>
/// Authorization filter that restricts access to tenant admin roles for endpoints marked with [RequireTenantAdmin].
///
/// Permitted roles:
///   - SystemAdmin  — system-wide administrator
///   - CompanyAdmin — organization administrator (stored as "admin" in JWT)
///
/// This filter runs AFTER [Authorize] validation, so the user is already authenticated.
/// Regular users and staff are rejected with 403 Forbidden.
///
/// Usage: Apply [RequireTenantAdmin] to controllers or actions that should be admin-only.
/// </summary>
public class TenantAdminFilter : IAsyncAuthorizationFilter
{
    private readonly ILogger<TenantAdminFilter> _logger;

    public TenantAdminFilter(ILogger<TenantAdminFilter> logger)
    {
        _logger = logger;
    }

    public Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        // Only run for endpoints decorated with [RequireTenantAdmin]
        var hasAttribute = context.ActionDescriptor.EndpointMetadata
            .OfType<RequireTenantAdminAttribute>()
            .Any();

        if (!hasAttribute)
            return Task.CompletedTask;

        var user = context.HttpContext.User;

        var isAdmin = user.IsInRole(UserRoles.SystemAdmin)
                   || user.IsInRole(UserRoles.CompanyAdmin);

        if (!isAdmin)
        {
            _logger.LogWarning(
                "Tenant admin access denied: User {UserName} does not hold an admin role",
                user.Identity?.Name ?? "unknown");

            context.Result = new ObjectResult(new { message = "Admin role required" })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
        }
        else
        {
            _logger.LogDebug(
                "Tenant admin access granted: User {UserName}",
                user.Identity?.Name ?? "unknown");
        }

        return Task.CompletedTask;
    }
}
