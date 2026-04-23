namespace OrderMgmt.Filters;

/// <summary>
/// Attribute that restricts an endpoint to tenant admin roles: CompanyAdmin ("admin") and SystemAdmin.
/// 
/// When applied, the TenantAdminFilter will verify that the authenticated user holds one of:
///   - SystemAdmin  (system-wide administrator)
///   - CompanyAdmin / "admin"  (organization-level administrator)
/// 
/// Regular users and staff will receive 403 Forbidden.
/// 
/// Usage example:
/// [Authorize]
/// [RequireTenantAdmin]
/// [HttpDelete("{id}")]
/// public async Task&lt;IActionResult&gt; DeleteSomething(Guid id) { ... }
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RequireTenantAdminAttribute : Attribute
{
}
