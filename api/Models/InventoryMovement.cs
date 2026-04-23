namespace OrderMgmt.Models;

/// <summary>
/// PARKING LOT: Review in Phase 3
/// 
/// This model may be deprecated or redundant with waste_event and reconciliation_record.
/// Purpose: Track all inventory movements (RECEIVED, USED, ADJUSTMENT, WASTE)
/// 
/// Potential overlap:
/// - waste_event (Phase 3): Specifically tracks waste/spoilage events
/// - reconciliation_record (Phase 3): Tracks physical count vs system count discrepancies
/// - inventory_movement: Generic movement tracking?
/// 
/// Phase 3 TODO: Review if this should be:
/// 1. Kept as general audit trail for all movements
/// 2. Consolidated into waste_event for waste movements
/// 3. Consolidated into reconciliation_record for adjustments
/// 4. Removed entirely if covered by other tables
/// 
/// NOTE: ReferenceId property is currently unused and should be clarified before Phase 3.
/// </summary>
public class InventoryMovement
{
    public long Id { get; set; }  // BIGINT primary key (for joins)
    public Guid ExternalId { get; set; }  // UUID external ID (for APIs)
    public Guid OrganizationId { get; set; }
    
    // Foreign Key Naming Convention: <<parent_table>>__<<child_table>>__<<column>>__FK
    [System.ComponentModel.DataAnnotations.Schema.Column("inventory_item_id")]
    public long InventoryItemId { get; set; }  // BIGINT FK to inventory_item (column: inventory_item_id)

    /// <summary>Optional: Foreign key to InventoryLot for lot traceability</summary>
    [System.ComponentModel.DataAnnotations.Schema.Column("inventory_lot_id")]
    public long? InventoryLotId { get; set; }
    
    public string MovementType { get; set; } = string.Empty; // RECEIVED, USED, ADJUSTMENT, WASTE
    public decimal QuantityChange { get; set; }
    public string? Reason { get; set; }
    public string? ReferenceId { get; set; }  // TODO: Clarify purpose in Phase 3 - currently unused
    public Guid? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Guid? UpdatedBy { get; set; }
    public int VersionNbr { get; set; } = 1;

    public virtual Organization? Organization { get; set; }
    public virtual InventoryItem? InventoryItem { get; set; }
    public virtual InventoryLot? InventoryLot { get; set; }
}
