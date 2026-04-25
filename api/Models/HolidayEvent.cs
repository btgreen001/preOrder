namespace PreOrderApp.Models;

public class HolidayEvent
{
    public long Id { get; set; }
    public Guid ExternalId { get; set; }
    public Guid OrganizationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime OpensAt { get; set; }
    public DateTime ClosesAt { get; set; }
    public DateTime PickupStartDt { get; set; }
    public DateTime PickupEndDt { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public virtual Organization? Organization { get; set; }
    public virtual ICollection<MenuItem> MenuItems { get; set; } = new List<MenuItem>();
    public virtual ICollection<PickupSlot> PickupSlots { get; set; } = new List<PickupSlot>();
    public virtual ICollection<PreOrder> PreOrders { get; set; } = new List<PreOrder>();
}
