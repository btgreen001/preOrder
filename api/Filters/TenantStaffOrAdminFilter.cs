using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using PreOrderApp.Models;

namespace PreOrderApp.Filters;

/// <summary>
/// Authorization filter that restricts access to tenant staff or admin roles for endpoints marked with
/// [RequireTenantStaffOrAdmin].
/// </summary>
public class TenantStaffOrAdminFilter : IAsyncAuthorizationFilter
{
    private readonly ILogger<TenantStaffOrAdminFilter> _logger;

    public TenantStaffOrAdminFilter(ILogger<TenantStaffOrAdminFilter> logger)
    {
        _logger = logger;
    }

    public Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var hasAttribute = context.ActionDescriptor.EndpointMetadata
            .OfType<RequireTenantStaffOrAdminAttribute>()
            .Any();

        if (!hasAttribute)
        {
            return Task.CompletedTask;
        }

        var user = context.HttpContext.User;

        var isAllowed = user.IsInRole(UserRoles.SystemAdmin)
            || user.IsInRole(UserRoles.CompanyAdmin)
            || user.IsInRole(UserRoles.User);

        if (!isAllowed)
        {
            _logger.LogWarning(
                "Tenant staff/admin access denied: User {UserName} does not hold a staff or admin role",
                user.Identity?.Name ?? "unknown");

            context.Result = new ObjectResult(new { message = "Staff or admin role required" })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
        }

        return Task.CompletedTask;
    }
}