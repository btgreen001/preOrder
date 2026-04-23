namespace PreOrderApp.Filters;

/// <summary>
/// Attribute that marks an endpoint for automatic tenant access validation.
/// When applied to a controller or action, the TenantAccessFilter will validate that:
/// 1. The user is authenticated
/// 2. The user's organization ID is valid
/// 3. The user belongs to that organization (or is a sysadmin)
/// 
/// This implements the defense-in-depth security pattern where both the controller
/// and service layer validate multi-tenant data isolation.
/// 
/// Usage example:
/// [Authorize]
/// [ValidateTenantAccess]
/// [HttpGet("my-endpoint")]
/// public async Task&lt;IActionResult&gt; MyEndpoint() { ... }
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class ValidateTenantAccessAttribute : Attribute
{
}
