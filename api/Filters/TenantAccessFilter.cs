using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using PreOrderApp.Services;

namespace PreOrderApp.Filters;

/// <summary>
/// Authorization filter that validates tenant access for endpoints marked with [ValidateTenantAccess].
/// 
/// This filter implements the multi-tenant security validation layer:
/// 1. Extracts user ID and organization ID from JWT claims
/// 2. Validates that the user belongs to the organization
/// 3. Allows sysadmins universal access
/// 4. Prevents cross-tenant data access attempts
/// 
/// The filter runs AFTER [Authorize] validation, so authentication is guaranteed.
/// It acts as the defense-in-depth control before the service layer also validates.
/// 
/// Usage: Apply [ValidateTenantAccess] attribute to tenant-specific endpoints.
/// </summary>
public class TenantAccessFilter : IAsyncAuthorizationFilter
{
    private readonly IOrganizationContextService _orgContext;
    private readonly ILogger<TenantAccessFilter> _logger;

    public TenantAccessFilter(IOrganizationContextService orgContext, ILogger<TenantAccessFilter> logger)
    {
        _orgContext = orgContext;
        _logger = logger;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        // Check if endpoint has ValidateTenantAccess attribute
        var hasAttribute = context.ActionDescriptor.EndpointMetadata
            .OfType<ValidateTenantAccessAttribute>()
            .Any();

        if (!hasAttribute)
            return;

        try
        {
            // Extract user and organization from JWT
            var userId = _orgContext.GetCurrentUserId();
            var organizationId = _orgContext.GetCurrentOrganizationId();

            // Validate user belongs to organization (sysadmins bypass check)
            var hasAccess = await _orgContext.ValidateUserOrganizationAccessAsync(userId, organizationId);
            
            if (!hasAccess)
            {
                _logger.LogWarning(
                    "Tenant access denied: User {UserId} attempted to access organization {OrganizationId} " +
                    "but is not a member of that organization",
                    userId, organizationId);
                
                context.Result = new UnauthorizedObjectResult(
                    new { message = "User is not a member of this organization" });
                return;
            }

            _logger.LogDebug(
                "Tenant access validated: User {UserId} has access to organization {OrganizationId}",
                userId, organizationId);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Tenant validation failed: Missing organization or user context in JWT");
            context.Result = new UnauthorizedObjectResult(
                new { message = "Invalid authentication context. User and organization must be authenticated." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during tenant access validation");
            context.Result = new StatusCodeResult(StatusCodes.Status500InternalServerError);
        }
    }
}
