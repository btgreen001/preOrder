namespace PreOrderApp.Models;

public class PickupSlot
{
    public long Id { get; set; }
    public Guid ExternalId { get; set; }
    public Guid OrganizationId { get; set; }
    public long HolidayEventId { get; set; }
    public DateTime SlotStartUtc { get; set; }
    public DateTime SlotEndUtc { get; set; }
    public int Capacity { get; set; }
    public int ReservedCount { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public virtual HolidayEvent? HolidayEvent { get; set; }
    public virtual Organization? Organization { get; set; }
    public virtual ICollection<PreOrder> PreOrders { get; set; } = new List<PreOrder>();
}
