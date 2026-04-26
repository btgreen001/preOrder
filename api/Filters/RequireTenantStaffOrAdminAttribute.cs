namespace PreOrderApp.Filters;

/// <summary>
/// Attribute that restricts an endpoint to tenant staff or admin roles.
/// 
/// Permitted roles:
///   - SystemAdmin
///   - CompanyAdmin
///   - staff
/// 
/// Unauthenticated users and non-tenant customer/delivery roles receive 403 Forbidden.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RequireTenantStaffOrAdminAttribute : Attribute
{
}