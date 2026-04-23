namespace OrderMgmt.Models;

/// <summary>
/// Represents a lot/batch of inventory received from a supplier or PO.
/// Tracks both expected (ordered) and actual (received) quantities and units.
/// Supports bidirectional tracking: inbound (received) and outbound (used/issued).
/// Dual ID architecture: numeric id (PK for joins) + UUID external_id (for APIs)
/// </summary>
public class InventoryLot
{
    /// <summary>Numeric primary key for database joins (BIGINT GENERATED)</summary>
    public long Id { get; set; }

    /// <summary>UUID external ID for API/URL exposure (UNIQUE)</summary>
    public Guid ExternalId { get; set; } = Guid.NewGuid();

    /// <summary>Organization ID for multi-tenancy scoping</summary>
    public Guid OrganizationId { get; set; }

    /// <summary>Foreign key to InventoryItem - what is in this lot</summary>
    public long InventoryItemId { get; set; }

    /// <summary>Optional: Foreign key to PurchaseOrder - what PO created this lot</summary>
    public long? PoId { get; set; }

    /// <summary>Direction: true = inbound (received), false = outbound (issued/used)</summary>
    public bool InboundFlg { get; set; } = true;

    /// <summary>Expected quantity (from PO or order)</summary>
    public decimal ExpectedQuantity { get; set; }

    /// <summary>Expected unit of measure (e.g., "pounds", "pieces", "liters")</summary>
    public string ExpectedUnitOfMeasure { get; set; } = "units";

    /// <summary>Actual quantity received or issued</summary>
    public decimal ActualQuantity { get; set; }

    /// <summary>Actual unit of measure (may differ from expected)</summary>
    public string ActualUnitOfMeasure { get; set; } = "units";

    /// <summary>Reason for any discrepancy between expected and actual</summary>
    public string? DiscrepancyReason { get; set; }

    /// <summary>When this lot expires (for perishable items)</summary>
    public DateTime? ExpirationDate { get; set; }

    /// <summary>When this lot was received</summary>
    public DateTime? ReceivedDate { get; set; }

    /// <summary>Audit: who created this record</summary>
    public Guid? CreatedBy { get; set; }

    /// <summary>Audit: when this record was created</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Audit: who last updated this record</summary>
    public Guid? UpdatedBy { get; set; }

    /// <summary>Audit: when this record was last updated</summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Audit: optimistic locking version number</summary>
    public int VersionNbr { get; set; } = 1;

    // Navigation properties
    public virtual Organization? Organization { get; set; }
    public virtual InventoryItem? InventoryItem { get; set; }
    // public virtual PurchaseOrder? PurchaseOrder { get; set; }  // TODO: Add when PO table exists
    public virtual ICollection<InventoryMovement> Movements { get; set; } = new List<InventoryMovement>();
}
