using PreOrderApp.Models;

namespace PreOrderApp.Services;

public interface IOrganizationService
{
    Task<Organization> GetByIdAsync(Guid id);
    Task<Organization> CreateAsync(Organization organization);
    Task<bool> ValidateRegistrationTokenAsync(string token);
    Task<IEnumerable<Organization>> GetAllAsync();
    Task UpdateAsync(Organization organization);
}