namespace PreOrderApp.Models;

public class PreOrder
{
    public long Id { get; set; }
    public Guid ExternalId { get; set; }
    public Guid OrganizationId { get; set; }
    public long HolidayEventId { get; set; }
    public long PickupSlotId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = "SUBMITTED";
    public decimal TotalAmount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public virtual Organization? Organization { get; set; }
    public virtual HolidayEvent? HolidayEvent { get; set; }
    public virtual PickupSlot? PickupSlot { get; set; }
    public virtual ICollection<PreOrderLine> Lines { get; set; } = new List<PreOrderLine>();
}
