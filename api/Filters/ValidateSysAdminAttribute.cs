namespace PreOrderApp.Filters;

/// <summary>
/// Attribute that restricts an endpoint to system admin roles: SystemAdmin.
/// 
/// When applied, the SysAdminFilter will verify that the authenticated user holds:
///   - SystemAdmin  (system-wide administrator)
/// 
/// Regular users and staff will receive 403 Forbidden.
/// 
/// Usage example:
/// [Authorize]
/// [ValidateSysAdmin]
/// [HttpDelete("{id}")]
/// public async Task&lt;IActionResult&gt; DeleteSomething(Guid id) { ... }
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class ValidateSysAdminAttribute : Attribute
{
}
