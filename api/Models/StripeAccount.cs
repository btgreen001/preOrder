namespace PreOrderApp.Models;


public class StripeAccount
{
    public int Id { get; set; }
    public Guid ExternalId { get; set; }
    public Guid? OrganizationId { get; set; }
    public string? AccountId { get; set; }
    public string? OnboardingStatusCd { get; set; }
    public bool IsEnabled { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? ModifiedOn { get; set; }

    public virtual Organization? Organization { get; set; }

}

