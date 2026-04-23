using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using OrderMgmt.Data;
using OrderMgmt.Models;

namespace OrderMgmt.Services;

/// <summary>
/// Centralized service for retrieving the current user's organization context from JWT claims.
/// This ensures all multi-tenant filtering is consistent and secure.
/// 
/// SECURITY: This service extracts the OrganizationId from the authenticated JWT token.
/// All backend operations MUST use this service to:
/// 1. Ensure users can only access their own organization's data
/// 2. Prevent unauthorized cross-tenant access
/// 3. Provide a single point of enforcement for multi-tenant isolation
/// 
/// IMPORTANT: This service should ONLY be used in [Authorize] protected endpoints.
/// For [AllowAnonymous] endpoints that need organization context:
/// - Require explicit organization ID (e.g., query parameter)
/// - NEVER silently fall back to client-provided org_id
/// - Always validate the organization exists and user has permission
/// - This is only acceptable for specific flows like PIN signin discovery
/// </summary>
public interface IOrganizationContextService
{
    /// <summary>
    /// Gets the current user's organization ID from the JWT token.
    /// Throws an exception if the token doesn't contain a valid org_id claim.
    /// 
    /// NOTE: This should only be called in [Authorize] protected endpoints where
    /// the user is guaranteed to be authenticated with a valid JWT.
    /// </summary>
    Guid GetCurrentOrganizationId();
    
    /// <summary>
    /// Tries to get the current user's organization ID from the JWT token.
    /// Returns false if the claim is missing or invalid.
    /// 
    /// Use this in [AllowAnonymous] endpoints that might have unauthenticated users.
    /// </summary>
    bool TryGetCurrentOrganizationId(out Guid organizationId);
    
    /// <summary>
    /// Gets the current user's ID from the JWT token (Subject claim).
    /// Throws an exception if the token doesn't contain a valid user ID claim.
    /// </summary>
    Guid GetCurrentUserId();
    
    /// <summary>
    /// Tries to get the current user's ID from the JWT token.
    /// Returns false if the claim is missing or invalid.
    /// </summary>
    bool TryGetCurrentUserId(out Guid userId);

    /// <summary>
    /// Validates that a user belongs to a given organization.
    /// Sysadmins bypass the organization check and always return true.
    /// Regular users must have their organization_id matching the provided organizationId.
    /// </summary>
    Task<bool> ValidateUserOrganizationAccessAsync(Guid userId, Guid organizationId);
}

public class OrganizationContextService : IOrganizationContextService
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly OrderMgmtDbContext _context;
    private readonly ILogger<OrganizationContextService> _logger;

    public OrganizationContextService(IHttpContextAccessor httpContextAccessor, OrderMgmtDbContext context, ILogger<OrganizationContextService> logger)
    {
        _httpContextAccessor = httpContextAccessor;
        _context = context;
        _logger = logger;
    }

    public Guid GetCurrentOrganizationId()
    {
        if (!TryGetCurrentOrganizationId(out var organizationId))
        {
            _logger.LogError("Organization ID claim not found in JWT token");
            throw new InvalidOperationException("Organization ID not found in token claims. User must be authenticated.");
        }

        return organizationId;
    }

    public bool TryGetCurrentOrganizationId(out Guid organizationId)
    {
        organizationId = Guid.Empty;

        var user = _httpContextAccessor.HttpContext?.User;
        if (user == null)
        {
            _logger.LogWarning("No authenticated user found in HTTP context");
            return false;
        }

        var orgIdClaim = user.FindFirst("org_id");
        if (orgIdClaim == null)
        {
            _logger.LogWarning("org_id claim not found in JWT token for user {UserName}", user.FindFirst(ClaimTypes.Name)?.Value ?? "unknown");
            return false;
        }

        if (!Guid.TryParse(orgIdClaim.Value, out organizationId))
        {
            _logger.LogError("Invalid org_id claim value: {OrgIdValue}", orgIdClaim.Value);
            return false;
        }

        return true;
    }

    public async Task<bool> ValidateUserOrganizationAccessAsync(Guid userId, Guid organizationId)
    {
        try
        {
            var user = await _context.SystemUsers.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
            {
                _logger.LogWarning("User {UserId} not found", userId);
                return false;
            }

            // Sysadmins get universal access
            if (user.UserRole == UserRoles.SystemAdmin)
            {
                return true;
            }

            // Everyone else must be a member of the organization
            return user.OrganizationId == organizationId;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating user organization access for user {UserId} and organization {OrganizationId}", userId, organizationId);
            return false;
        }
    }

    public Guid GetCurrentUserId()
    {
        if (!TryGetCurrentUserId(out var userId))
        {
            _logger.LogError("User ID claim not found in JWT token");
            throw new InvalidOperationException("User ID not found in token claims. User must be authenticated.");
        }

        return userId;
    }

    public bool TryGetCurrentUserId(out Guid userId)
    {
        userId = Guid.Empty;

        var user = _httpContextAccessor.HttpContext?.User;
        if (user == null)
        {
            _logger.LogWarning("No authenticated user found in HTTP context");
            return false;
        }

        // Subject claim contains the user ID
        var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier) ?? user.FindFirst("sub");
        if (userIdClaim == null)
        {
            _logger.LogWarning("User ID claim not found in JWT token");
            return false;
        }

        if (!Guid.TryParse(userIdClaim.Value, out userId))
        {
            _logger.LogError("Invalid user ID claim value: {UserIdValue}", userIdClaim.Value);
            return false;
        }

        return true;
    }
}
