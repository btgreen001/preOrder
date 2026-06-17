namespace PreOrderApp.Models;

public class SellableProduct
{
    public long Id { get; set; }
    public Guid ExternalId { get; set; }
    public Guid OrganizationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Sku { get; set; }
    public long? CategoryId { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal? UnitCost { get; set; }
    public decimal QuantityOnHand { get; set; } = 0;
    public bool IsActive { get; set; } = true;
    public bool IsRecipeComponent { get; set; } = false;
    public bool IsForSale { get; set; } = true;
    public decimal? OutputUnitCount { get; set; }
    public string? OutputUnitMsr { get; set; }
    public decimal? BaseUnitsPerOutputUnit { get; set; }
    public decimal ServingsPerPackage { get; set; } = 1;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int VersionNbr { get; set; } = 1;

    public virtual Organization? Organization { get; set; }
    public virtual ProductCategory? ProductCategory { get; set; }

    // ⭐ REQUIRED for EF relationship
    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}
