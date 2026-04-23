namespace PreOrderApp.Models;

public enum LicenseTier
{
    Basic,
    Standard,
    Professional,
    Enterprise
}

public class LicenseFeatures
{
    public int MaxUsers { get; set; }
    public bool HasAdvancedOrderManagement { get; set; }
    public bool HasBasicApiAccess { get; set; }
    public bool HasFullApiAccess { get; set; }
    public bool HasCustomBranding { get; set; }
    public bool HasWhiteLabeling { get; set; }
    public bool HasPrioritySupport { get; set; }
    public bool HasDedicatedSupport { get; set; }
    public bool HasAdvancedReporting { get; set; }
    public bool HasDataExportImport { get; set; }
    public bool HasCustomDevelopment { get; set; }
    public bool HasSlaGuarantees { get; set; }
    public bool HasAdvancedSecurity { get; set; }

    public static LicenseFeatures GetFeaturesForTier(LicenseTier tier)
    {
        return tier switch
        {
            LicenseTier.Basic => new LicenseFeatures
            {
                MaxUsers = 1,
                HasAdvancedOrderManagement = false,
                HasBasicApiAccess = false,
                HasFullApiAccess = false,
                HasCustomBranding = false,
                HasWhiteLabeling = false,
                HasPrioritySupport = false,
                HasDedicatedSupport = false,
                HasAdvancedReporting = false,
                HasDataExportImport = false,
                HasCustomDevelopment = false,
                HasSlaGuarantees = false,
                HasAdvancedSecurity = false
            },
            LicenseTier.Standard => new LicenseFeatures
            {
                MaxUsers = 5,
                HasAdvancedOrderManagement = true,
                HasBasicApiAccess = true,
                HasFullApiAccess = false,
                HasCustomBranding = false,
                HasWhiteLabeling = false,
                HasPrioritySupport = false,
                HasDedicatedSupport = false,
                HasAdvancedReporting = false,
                HasDataExportImport = false,
                HasCustomDevelopment = false,
                HasSlaGuarantees = false,
                HasAdvancedSecurity = false
            },
            LicenseTier.Professional => new LicenseFeatures
            {
                MaxUsers = 25,
                HasAdvancedOrderManagement = true,
                HasBasicApiAccess = true,
                HasFullApiAccess = true,
                HasCustomBranding = true,
                HasWhiteLabeling = false,
                HasPrioritySupport = true,
                HasDedicatedSupport = false,
                HasAdvancedReporting = true,
                HasDataExportImport = true,
                HasCustomDevelopment = false,
                HasSlaGuarantees = false,
                HasAdvancedSecurity = false
            },
            LicenseTier.Enterprise => new LicenseFeatures
            {
                MaxUsers = int.MaxValue,
                HasAdvancedOrderManagement = true,
                HasBasicApiAccess = true,
                HasFullApiAccess = true,
                HasCustomBranding = true,
                HasWhiteLabeling = true,
                HasPrioritySupport = true,
                HasDedicatedSupport = true,
                HasAdvancedReporting = true,
                HasDataExportImport = true,
                HasCustomDevelopment = true,
                HasSlaGuarantees = true,
                HasAdvancedSecurity = true
            },
            _ => throw new ArgumentOutOfRangeException(nameof(tier))
        };
    }
}

public class LicenseSubscription
{
    public Guid SubscriptionId { get; set; }
    public string IdentityHash { get; set; } = string.Empty;
    public Guid OrganizationId { get; set; }
    public LicenseTier Tier { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? ReferralCode { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime ModifiedOn { get; set; }

    public virtual Organization? Organization { get; set; }
}