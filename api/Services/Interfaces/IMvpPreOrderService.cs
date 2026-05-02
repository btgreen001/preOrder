using PreOrderApp.Models;
using System.Text.Json.Serialization;
using PreOrderApp.Infrastructure;

namespace PreOrderApp.Services.Interfaces;

public interface IMvpPreOrderService
{
    Task<List<HolidayEvent>> GetHolidayEventsAsync(Guid organizationId);
    Task<List<HolidayEvent>> GetAllHolidayEventsAsync(Guid organizationId);
    Task<HolidayEvent> CreateHolidayEventAsync(Guid organizationId, CreateHolidayEventRequest request);
    Task<HolidayEvent> UpdateHolidayEventAsync(Guid organizationId, Guid holidayEventExternalId, UpdateHolidayEventRequest request);

    Task<List<MenuItem>> GetMenuItemsAsync(Guid organizationId, Guid holidayEventExternalId);
    Task<MenuItem> CreateMenuItemAsync(Guid organizationId, CreateMenuItemRequest request);
    Task<MenuItem> UpdateMenuItemAsync(Guid organizationId, Guid menuItemExternalId, UpdateMenuItemRequest request);

    Task<List<PickupSlot>> GetPickupSlotsAsync(Guid organizationId, Guid holidayEventExternalId);
    Task<PickupSlot> CreatePickupSlotAsync(Guid organizationId, CreatePickupSlotRequest request);
    Task<PickupSlot> UpdatePickupSlotAsync(Guid organizationId, Guid pickupSlotExternalId, UpdatePickupSlotRequest request);

    Task<List<PreOrder>> GetPreOrdersAsync(Guid organizationId, Guid? holidayEventExternalId = null);
    Task<string> ExportPreOrdersCsvAsync(Guid organizationId, Guid? holidayEventExternalId = null, DateTime? pickupDateUtc = null);
    Task<PreOrder> CreatePreOrderAsync(Guid organizationId, CreatePreOrderRequest request);
    Task<PreOrder> UpdatePreOrderStatusAsync(Guid organizationId, Guid preOrderExternalId, string nextStatus, Guid? changedByUserId = null, string? ipAddress = null, string? userAgent = null);
}

public class CreateHolidayEventRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    [JsonConverter(typeof(WallClockDateTimeConverter))]
    public DateTime OpensAt { get; set; }

    [JsonConverter(typeof(WallClockDateTimeConverter))]
    public DateTime ClosesAt { get; set; }

    [JsonConverter(typeof(WallClockDateTimeConverter))]
    public DateTime PickupStartDt { get; set; }

    [JsonConverter(typeof(WallClockDateTimeConverter))]
    public DateTime PickupEndDt { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateHolidayEventRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    
    [JsonConverter(typeof(WallClockDateTimeConverter))]
    public DateTime OpensAt { get; set; }
    
    [JsonConverter(typeof(WallClockDateTimeConverter))]
    public DateTime ClosesAt { get; set; }
    
    [JsonConverter(typeof(WallClockDateTimeConverter))]
    public DateTime PickupStartDt { get; set; }
    
    [JsonConverter(typeof(WallClockDateTimeConverter))]
    public DateTime PickupEndDt { get; set; }
    
    public bool IsActive { get; set; } = true;
}

public class CreateMenuItemRequest
{
    public Guid HolidayEventExternalId { get; set; }
    public Guid? ProductExternalId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public int? MaxPerOrder { get; set; }
    public int SortOrder { get; set; }
}

public class UpdateMenuItemRequest
{
    public Guid HolidayEventExternalId { get; set; }
    public Guid? ProductExternalId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public int? MaxPerOrder { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class CreatePickupSlotRequest
{
    public Guid HolidayEventExternalId { get; set; }
    
    [JsonConverter(typeof(WallClockDateTimeConverter))]
    public DateTime SlotStartAt { get; set; }
    
    [JsonConverter(typeof(WallClockDateTimeConverter))]
    public DateTime SlotEndAt { get; set; }
    
    public int Capacity { get; set; }
}

public class UpdatePickupSlotRequest
{
    public Guid HolidayEventExternalId { get; set; }
    
    [JsonConverter(typeof(WallClockDateTimeConverter))]
    public DateTime SlotStartAt { get; set; }
    
    [JsonConverter(typeof(WallClockDateTimeConverter))]
    public DateTime SlotEndAt { get; set; }
    
    public int Capacity { get; set; }
    public bool IsActive { get; set; } = true;
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

public class UpdatePreOrderStatusRequest
{
    public string Status { get; set; } = string.Empty;
}
