namespace PreOrderApp.Models;

public class ItemCategory
{
    public long Id { get; set; }  // BIGINT primary key (for joins)
    public Guid ExternalId { get; set; }  // UUID external ID (for APIs)
    public Guid OrganizationId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string CategoryCode { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int VersionNbr { get; set; } = 1;

    public virtual Organization? Organization { get; set; }
    public virtual ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();
}
