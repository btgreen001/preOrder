namespace PreOrderApp.Models;

/// <summary>
/// Unified product movement tracking for finished goods and resellable products.
/// Replaces legacy waste_event table and consolidates all movement types:
/// - RECEIVED: Products received from supplier
/// - SOLD: Products sold to customer
/// - WASTED: Products wasted due to spoilage, QC, damage, etc.
/// - ADJUSTED: Inventory adjustments
/// Dual ID architecture: numeric id (PK for joins) + UUID external_id (for APIs)
/// </summary>
public class ProductMovement
{
    /// <summary>Numeric primary key for database joins (BIGINT GENERATED)</summary>
    public long Id { get; set; }

    /// <summary>UUID external ID for API/URL exposure (UNIQUE)</summary>
    public Guid ExternalId { get; set; } = Guid.NewGuid();

    /// <summary>Organization ID for multi-tenancy scoping</summary>
    public Guid OrganizationId { get; set; }

    /// <summary>Foreign key to SellableProduct - what product moved</summary>
    public long SellableProductId { get; set; }

    /// <summary>Optional: Foreign key to FinishedGoodsBatch - if this movement is from a batch</summary>
    public long? FinishedGoodsBatchId { get; set; }

    /// <summary>Optional: Foreign key to InventoryLot - for traceability from raw materials</summary>
    public long? InventoryLotId { get; set; }

    /// <summary>Optional: Foreign key to PurchaseOrder - if received from PO</summary>
    public long? PoId { get; set; }

    /// <summary>Type of movement: RECEIVED, SOLD, WASTED, ADJUSTED</summary>
    public string MovementType { get; set; } = "RECEIVED";

    /// <summary>Quantity moved</summary>
    public decimal Quantity { get; set; }

    /// <summary>Unit of measure (e.g., "pieces", "pounds", "cups")</summary>
    public string UnitOfMeasure { get; set; } = "pieces";

    /// <summary>Reason for movement (e.g., "Customer Order #123", "Spoilage", "Inventory Adjustment")</summary>
    public string? Reason { get; set; }

    /// <summary>Reference ID for traceability (e.g., order ID, batch number, PO number)</summary>
    public string? ReferenceId { get; set; }

    /// <summary>When this movement occurred (UTC)</summary>
    public DateTime MovementDate { get; set; } = DateTime.UtcNow;

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
    public virtual SellableProduct? SellableProduct { get; set; }
    public virtual FinishedGoodsBatch? FinishedGoodsBatch { get; set; }
    public virtual InventoryLot? InventoryLot { get; set; }
    // public virtual PurchaseOrder? PurchaseOrder { get; set; }  // TODO: Add when PO table exists
}
