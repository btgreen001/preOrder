namespace PreOrderApp.Models;

public class UnitConversion
{
    public long UnitConversionId { get; set; }
    public Guid ExternalId { get; set; } = Guid.NewGuid();

    // NULL = global conversion, non-NULL = organization override conversion
    // this joins to organization through the ID field which is different than its GUID
    public long? OrganizationId { get; set; }

    public string FromUnit { get; set; } = string.Empty;
    public string ToUnit { get; set; } = string.Empty;
    public decimal ConversionFactor { get; set; }
    public string? Category { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid? CreatedBy { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Guid? UpdatedBy { get; set; }
    public int VersionNbr { get; set; } = 1;
}
