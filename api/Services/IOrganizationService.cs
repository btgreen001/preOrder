using PreOrderApp.Models;

namespace PreOrderApp.Services;

public interface IOrganizationService
{
    Task<Organization> GetByIdAsync(Guid id);
    Task<Organization> CreateAsync(Organization organization);
    Task<bool> ValidateRegistrationTokenAsync(string token);
    Task<bool> IsRegistrationInviteEmailAvailableAsync(Guid organizationId, string email);

    Task<object> CheckOnboardingStatusAsync(Guid organizationId, string accountId);
    Task<StripeOnboardingResponse> StartOnboardingAsync(Guid organizationId);
    Task<IEnumerable<Organization>> GetAllAsync();
    Task UpdateAsync(Organization organization);

}
public class StripeOnboardingResponse
{
    public string? AccountId { get; set; }
    public string? OnboardingUrl { get; set; }
}
