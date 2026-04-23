namespace OrderMgmt.Models;

public class InventoryItem
{
    public long Id { get; set; }  // BIGINT primary key (for joins)
    public Guid ExternalId { get; set; }  // UUID external ID (for APIs)
    public Guid OrganizationId { get; set; }
    public string Name { get; set; } = string.Empty;  // e.g., "Flour", "Eggs", "Chocolate"
    public string? Description { get; set; }
    public string? Sku { get; set; }
    public string? WarehouseLocation { get; set; }
    public decimal QuantityOnHand { get; set; }
    public decimal QuantityReserved { get; set; } = 0;
    public string UnitOfMeasure { get; set; } = "units";
    public string? DefaultPurchaseUnitOfMeasure { get; set; }
    public decimal? DefaultItemDensity { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpirationDate { get; set; }
    public decimal UnitCost { get; set; }
    public DateTime? LastReceivedAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public decimal ReorderPoint { get; set; } = 0;  // Phase 2: Reorder point threshold
    public decimal ReorderQty { get; set; } = 0;    // Phase 2: Quantity to order when below reorder point
    public long? SupplierId { get; set; }           // Phase 2: Associated supplier (BIGINT FK)
    public DateTime? LastOrderDate { get; set; }    // Phase 2: Last order date for this inventory
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid? CreatedBy { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Guid? UpdatedBy { get; set; }
    public int VersionNbr { get; set; } = 1;
    public long? CategoryId { get; set; }
    public virtual Organization? Organization { get; set; }
    public virtual Supplier? Supplier { get; set; }
    public virtual ICollection<InventoryMovement> Movements { get; set; } = new List<InventoryMovement>();
    public virtual ICollection<InventoryLot> Lots { get; set; } = new List<InventoryLot>();
    public virtual ItemCategory? ItemCategory { get; set; }
}