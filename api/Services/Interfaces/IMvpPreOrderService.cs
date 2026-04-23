using PreOrderApp.Models;

namespace PreOrderApp.Services.Interfaces;

public interface IMvpPreOrderService
{
    Task<List<HolidayEvent>> GetHolidayEventsAsync(Guid organizationId);
    Task<HolidayEvent> CreateHolidayEventAsync(Guid organizationId, CreateHolidayEventRequest request);

    Task<List<MenuItem>> GetMenuItemsAsync(Guid organizationId, Guid holidayEventExternalId);
    Task<MenuItem> CreateMenuItemAsync(Guid organizationId, CreateMenuItemRequest request);

    Task<List<PickupSlot>> GetPickupSlotsAsync(Guid organizationId, Guid holidayEventExternalId);
    Task<PickupSlot> CreatePickupSlotAsync(Guid organizationId, CreatePickupSlotRequest request);

    Task<List<PreOrder>> GetPreOrdersAsync(Guid organizationId, Guid? holidayEventExternalId = null);
    Task<PreOrder> CreatePreOrderAsync(Guid organizationId, CreatePreOrderRequest request);
}

public class CreateHolidayEventRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime OpensOnUtc { get; set; }
    public DateTime ClosesOnUtc { get; set; }
    public DateTime PickupStartDateUtc { get; set; }
    public DateTime PickupEndDateUtc { get; set; }
}

public class CreateMenuItemRequest
{
    public Guid HolidayEventExternalId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public int? MaxPerOrder { get; set; }
    public int SortOrder { get; set; }
}

public class CreatePickupSlotRequest
{
    public Guid HolidayEventExternalId { get; set; }
    public DateTime SlotStartUtc { get; set; }
    public DateTime SlotEndUtc { get; set; }
    public int Capacity { get; set; }
}

public class CreatePreOrderRequest
{
    public Guid HolidayEventExternalId { get; set; }
    public Guid PickupSlotExternalId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public string? Notes { get; set; }
    public List<CreatePreOrderLineRequest> Lines { get; set; } = new();
}

public class CreatePreOrderLineRequest
{
    public Guid MenuItemExternalId { get; set; }
    public int Quantity { get; set; }
}
