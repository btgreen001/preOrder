namespace PreOrderApp.Models;

public class Order
{
    public long Id { get; set; }  // BIGINT primary key (for joins)
    public Guid ExternalId { get; set; }  // UUID external ID (for APIs)
    public Guid OrganizationId { get; set; }
    public long CustomerId { get; set; }  // BIGINT FK to customer
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public long? HolidayEventId { get; set; }
    public long? PickupSlotId { get; set; }
    public Guid? DeliveryId { get; set; }
    public DateTime OrderDate { get; set; }
    public string OrderStatus { get; set; } = "PENDING"; // PENDING, CONFIRMED, COMPLETED, CANCELLED
    public decimal TotalAmount { get; set; }
    public string? SpecialInstructionTxt { get; set; }
    public DateTime? OrderedAt { get; set; }             // Phase 2: Explicit order timestamp
    public DateTime? CompletedAt { get; set; }           // Phase 2: When order was completed
    public DateTime? CancelledAt { get; set; }           // Phase 2: When order was cancelled
    public int OrderPriority { get; set; } = 0;          // Phase 2: Priority level for fulfillment (0=normal, 1=high, -1=low)
    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int VersionNbr { get; set; } = 1;
    
    public virtual Organization? Organization { get; set; }
    public virtual Customer? Customer { get; set; }
    public virtual HolidayEvent? HolidayEvent { get; set; }
    public virtual PickupSlot? PickupSlot { get; set; }
    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}