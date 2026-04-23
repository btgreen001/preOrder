namespace OrderMgmt.Models;

/// <summary>
/// Waste/spoilage events. Tracks when inventory items or batches are wasted, why, and the cost impact.
/// Can be linked to either a batch or an inventory item for flexible tracking.
/// Dual ID architecture: numeric id (PK for joins) + UUID external_id (for APIs)
/// </summary>
public class WasteEvent
{
    /// <summary>Numeric primary key for database joins (BIGINT GENERATED)</summary>
    public long Id { get; set; }

    /// <summary>UUID external ID for API/URL exposure (UNIQUE)</summary>
    public Guid ExternalId { get; set; } = Guid.NewGuid();

    /// <summary>Organization ID for multi-tenancy scoping</summary>
    public Guid OrganizationId { get; set; }

    /// <summary>Optional: Foreign key to FinishedGoodsBatch (if waste from a production batch)</summary>
    public long? BatchId { get; set; }

    /// <summary>Optional: Foreign key to InventoryItem (if waste from raw inventory)</summary>
    public long? InventoryItemId { get; set; }

    /// <summary>Quantity wasted</summary>
    public decimal QuantityWasted { get; set; }

    /// <summary>Unit of measure (e.g., "pieces", "pounds", "cups")</summary>
    public string Unit { get; set; } = "pieces";

    /// <summary>Reason for waste: Spoilage, QualityControl, Discrepancy, Damaged, Contamination, Expired, Other</summary>
    public string WasteReason { get; set; } = "Other";

    /// <summary>Cost impact of this waste event (calculated as quantity * unit_cost)</summary>
    public decimal WasteCost { get; set; }

    /// <summary>User or system that recorded this waste event</summary>
    public string RecordedBy { get; set; } = "system";

    /// <summary>When this waste event was recorded</summary>
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Additional notes about this waste event</summary>
    public string? Notes { get; set; }

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
    public FinishedGoodsBatch? Batch { get; set; }
    public InventoryItem? InventoryItem { get; set; }
    public Organization? Organization { get; set; }
}
