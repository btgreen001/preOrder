using Microsoft.EntityFrameworkCore;
using PreOrderApp.Data;
using PreOrderApp.Models;
using PreOrderApp.Services.Interfaces;

namespace PreOrderApp.Services;

public class MvpPreOrderService : IMvpPreOrderService
{
    private readonly AppDbContext _context;
    private readonly ILogger<MvpPreOrderService> _logger;

    public MvpPreOrderService(AppDbContext context, ILogger<MvpPreOrderService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<HolidayEvent>> GetHolidayEventsAsync(Guid organizationId)
    {
        return await _context.HolidayEvents
            .Where(e => e.OrganizationId == organizationId && e.IsActive)
            .OrderBy(e => e.OpensOnUtc)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<HolidayEvent> CreateHolidayEventAsync(Guid organizationId, CreateHolidayEventRequest request)
    {
        var entity = new HolidayEvent
        {
            ExternalId = Guid.NewGuid(),
            OrganizationId = organizationId,
            Name = request.Name,
            Description = request.Description,
            OpensOnUtc = request.OpensOnUtc,
            ClosesOnUtc = request.ClosesOnUtc,
            PickupStartDateUtc = request.PickupStartDateUtc,
            PickupEndDateUtc = request.PickupEndDateUtc,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.HolidayEvents.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<List<MenuItem>> GetMenuItemsAsync(Guid organizationId, Guid holidayEventExternalId)
    {
        var holidayEvent = await ResolveHolidayEventAsync(organizationId, holidayEventExternalId);

        return await _context.MenuItems
            .Where(m => m.OrganizationId == organizationId && m.HolidayEventId == holidayEvent.Id && m.IsActive)
            .OrderBy(m => m.SortOrder)
            .ThenBy(m => m.Name)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<MenuItem> CreateMenuItemAsync(Guid organizationId, CreateMenuItemRequest request)
    {
        var holidayEvent = await ResolveHolidayEventAsync(organizationId, request.HolidayEventExternalId);

        var entity = new MenuItem
        {
            ExternalId = Guid.NewGuid(),
            OrganizationId = organizationId,
            HolidayEventId = holidayEvent.Id,
            Name = request.Name,
            Description = request.Description,
            Price = request.Price,
            MaxPerOrder = request.MaxPerOrder,
            SortOrder = request.SortOrder,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.MenuItems.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<List<PickupSlot>> GetPickupSlotsAsync(Guid organizationId, Guid holidayEventExternalId)
    {
        var holidayEvent = await ResolveHolidayEventAsync(organizationId, holidayEventExternalId);

        return await _context.PickupSlots
            .Where(s => s.OrganizationId == organizationId && s.HolidayEventId == holidayEvent.Id && s.IsActive)
            .OrderBy(s => s.SlotStartUtc)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<PickupSlot> CreatePickupSlotAsync(Guid organizationId, CreatePickupSlotRequest request)
    {
        if (request.SlotEndUtc <= request.SlotStartUtc)
        {
            throw new InvalidOperationException("Pickup slot end time must be after start time.");
        }

        if (request.Capacity < 1)
        {
            throw new InvalidOperationException("Pickup slot capacity must be at least 1.");
        }

        var holidayEvent = await ResolveHolidayEventAsync(organizationId, request.HolidayEventExternalId);

        var entity = new PickupSlot
        {
            ExternalId = Guid.NewGuid(),
            OrganizationId = organizationId,
            HolidayEventId = holidayEvent.Id,
            SlotStartUtc = request.SlotStartUtc,
            SlotEndUtc = request.SlotEndUtc,
            Capacity = request.Capacity,
            ReservedCount = 0,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.PickupSlots.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<List<PreOrder>> GetPreOrdersAsync(Guid organizationId, Guid? holidayEventExternalId = null)
    {
        var query = _context.PreOrders
            .Where(p => p.OrganizationId == organizationId)
            .Include(p => p.Lines)
            .ThenInclude(l => l.MenuItem)
            .AsQueryable();

        if (holidayEventExternalId.HasValue)
        {
            var holidayEvent = await ResolveHolidayEventAsync(organizationId, holidayEventExternalId.Value);
            query = query.Where(p => p.HolidayEventId == holidayEvent.Id);
        }

        return await query
            .OrderByDescending(p => p.CreatedAt)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<PreOrder> CreatePreOrderAsync(Guid organizationId, CreatePreOrderRequest request)
    {
        if (request.Lines == null || request.Lines.Count == 0)
        {
            throw new InvalidOperationException("Preorder must include at least one line item.");
        }

        var holidayEvent = await ResolveHolidayEventAsync(organizationId, request.HolidayEventExternalId);
        var pickupSlot = await ResolvePickupSlotAsync(organizationId, holidayEvent.Id, request.PickupSlotExternalId);

        if (!pickupSlot.IsActive)
        {
            throw new InvalidOperationException("Pickup slot is inactive.");
        }

        if (pickupSlot.ReservedCount >= pickupSlot.Capacity)
        {
            throw new InvalidOperationException("Pickup slot capacity has been reached.");
        }

        var menuItemExternalIds = request.Lines.Select(l => l.MenuItemExternalId).Distinct().ToList();
        var menuItems = await _context.MenuItems
            .Where(m => m.OrganizationId == organizationId && m.HolidayEventId == holidayEvent.Id && m.IsActive && menuItemExternalIds.Contains(m.ExternalId))
            .ToDictionaryAsync(m => m.ExternalId, m => m);

        var preorder = new PreOrder
        {
            ExternalId = Guid.NewGuid(),
            OrganizationId = organizationId,
            HolidayEventId = holidayEvent.Id,
            PickupSlotId = pickupSlot.Id,
            CustomerName = request.CustomerName,
            CustomerEmail = request.CustomerEmail,
            CustomerPhone = request.CustomerPhone,
            Notes = request.Notes,
            Status = "SUBMITTED",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        decimal total = 0;
        foreach (var line in request.Lines)
        {
            if (!menuItems.TryGetValue(line.MenuItemExternalId, out var menuItem))
            {
                throw new KeyNotFoundException($"Menu item not found for external id {line.MenuItemExternalId}");
            }

            if (line.Quantity < 1)
            {
                throw new InvalidOperationException("Line quantity must be at least 1.");
            }

            if (menuItem.MaxPerOrder.HasValue && line.Quantity > menuItem.MaxPerOrder.Value)
            {
                throw new InvalidOperationException($"Line quantity exceeds max-per-order for item {menuItem.Name}.");
            }

            total += menuItem.Price * line.Quantity;

            preorder.Lines.Add(new PreOrderLine
            {
                ExternalId = Guid.NewGuid(),
                MenuItemId = menuItem.Id,
                Quantity = line.Quantity,
                UnitPrice = menuItem.Price
            });
        }

        preorder.TotalAmount = total;
        pickupSlot.ReservedCount += 1;
        pickupSlot.UpdatedAt = DateTime.UtcNow;

        _context.PreOrders.Add(preorder);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Preorder {ExternalId} created for event {HolidayEventId}", preorder.ExternalId, holidayEvent.ExternalId);

        return preorder;
    }

    private async Task<HolidayEvent> ResolveHolidayEventAsync(Guid organizationId, Guid holidayEventExternalId)
    {
        var holidayEvent = await _context.HolidayEvents
            .FirstOrDefaultAsync(e => e.OrganizationId == organizationId && e.ExternalId == holidayEventExternalId);

        if (holidayEvent == null)
        {
            throw new KeyNotFoundException($"Holiday event {holidayEventExternalId} not found.");
        }

        return holidayEvent;
    }

    private async Task<PickupSlot> ResolvePickupSlotAsync(Guid organizationId, long holidayEventId, Guid pickupSlotExternalId)
    {
        var pickupSlot = await _context.PickupSlots
            .FirstOrDefaultAsync(s => s.OrganizationId == organizationId && s.HolidayEventId == holidayEventId && s.ExternalId == pickupSlotExternalId);

        if (pickupSlot == null)
        {
            throw new KeyNotFoundException($"Pickup slot {pickupSlotExternalId} not found.");
        }

        return pickupSlot;
    }
}
