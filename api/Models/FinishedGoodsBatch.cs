namespace PreOrderApp.Models;

/// <summary>
/// Production batches of finished goods. Tracks each batch from production through sale/waste.
/// Includes expiration dates, cost calculations, and status tracking.
/// Dual ID architecture: numeric id (PK for joins) + UUID external_id (for APIs)
/// </summary>
public class FinishedGoodsBatch
{
    /// <summary>Numeric primary key for database joins (BIGINT GENERATED)</summary>
    public long Id { get; set; }

    /// <summary>UUID external ID for API/URL exposure (UNIQUE)</summary>
    public Guid ExternalId { get; set; } = Guid.NewGuid();

    /// <summary>Organization ID for multi-tenancy scoping</summary>
    public Guid OrganizationId { get; set; }

    /// <summary>Foreign key to RecipeDetail (recipe used for this batch)</summary>
    public long RecipeId { get; set; }

    /// <summary>Foreign key to SellableProduct (finished product type)</summary>
    public long ProductId { get; set; }

    /// <summary>Quantity produced in this batch</summary>
    public int QuantityProduced { get; set; }

    /// <summary>Unit of measure (e.g., "pieces", "loaves", "boxes")</summary>
    public string Unit { get; set; } = "pieces";

    /// <summary>When this batch was produced</summary>
    public DateTime ProductionDate { get; set; } = DateTime.UtcNow;

    /// <summary>When this batch expires (for perishable goods)</summary>
    public DateTime? ExpirationDate { get; set; }

    /// <summary>Cost per unit (calculated from recipe ingredients at time of production)</summary>
    public decimal CostPerUnit { get; set; }

    /// <summary>Unique batch number for tracking and traceability (e.g., "BREAD-20251102-001")</summary>
    public string? BatchNumber { get; set; }

    /// <summary>Current batch status: Active, Sold, Expired, Wasted, OnHold</summary>
    public string Status { get; set; } = "Active";

    /// <summary>Quantity actually sold from this batch</summary>
    public int QuantitySold { get; set; } = 0;

    /// <summary>Quantity discarded/wasted from this batch</summary>
    public int QuantityWasted { get; set; } = 0;

    /// <summary>Audit: who created this record</summary>
    public string CreatedBy { get; set; } = "system";

    /// <summary>Audit: when this record was created</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Audit: who last updated this record</summary>
    public string UpdatedBy { get; set; } = "system";

    /// <summary>Audit: when this record was last updated</summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Audit: optimistic locking version number</summary>
    public int VersionNbr { get; set; } = 1;

    // Navigation properties
    public RecipeDetail? Recipe { get; set; }
    public SellableProduct? Product { get; set; }
    public Organization? Organization { get; set; }
    public ICollection<WasteEvent> WasteEvents { get; set; } = new List<WasteEvent>();
}
