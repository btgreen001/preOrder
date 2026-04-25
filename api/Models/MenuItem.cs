namespace PreOrderApp.Models;

public class MenuItem
{
    public long Id { get; set; }

    public Guid ExternalId { get; set; }
    public Guid OrganizationId { get; set; }
    public long HolidayEventId { get; set; }
    public long? SellableProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public int? MaxPerOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public virtual HolidayEvent? HolidayEvent { get; set; }
    public virtual Organization? Organization { get; set; }
    public virtual SellableProduct? SellableProduct { get; set; }
    public virtual ICollection<PreOrderLine> PreOrderLines { get; set; } = new List<PreOrderLine>();
    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}
