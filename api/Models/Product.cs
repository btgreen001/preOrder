namespace OrderMgmt.Models;

public class SellableProduct
{
    public long Id { get; set; }  // BIGINT primary key (for joins)
    public Guid ExternalId { get; set; }  // UUID external ID (for APIs)
    public Guid OrganizationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Sku { get; set; }
    public long? CategoryId { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal? UnitCost { get; set; }
    public decimal QuantityOnHand { get; set; } = 0;  // Phase 2: Finished goods inventory
    public bool IsActive { get; set; } = true;
    public bool IsRecipeComponent { get; set; } = false;  // Component flag: true if this is an intermediate product used in recipes
    public bool IsForSale { get; set; } = true;  // Sale flag: true if this product is available for sale
    public decimal? OutputUnitCount { get; set; } //Meaning: If your product is sold or used in packages, this tells you how many base units are in each package.
    public string? OutputUnitMsr { get; set; } //Meaning: The label for the output unit (e.g., "case", "box", "bottle", "kg", "lb").
    public decimal? BaseUnitsPerOutputUnit { get; set; }
    public decimal ServingsPerPackage { get; set; } = 1;  // Number of servings per package unit (e.g., 4 servings per box)
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int VersionNbr { get; set; } = 1;

    public virtual Organization? Organization { get; set; }
    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    public virtual ProductCategory? ProductCategory { get; set; }
}
