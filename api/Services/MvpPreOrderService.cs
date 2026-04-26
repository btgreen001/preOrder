using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Text;
using PreOrderApp.Data;
using PreOrderApp.Models;
using PreOrderApp.Services.Interfaces;

namespace PreOrderApp.Services;

/// <summary>
/// MVP PreOrder Service: Manages holiday events, menu items, pickup slots, and customer orders.
/// 
/// DATETIME SEMANTICS:
/// - Business times (OpensAt, ClosesAt, PickupStartDt, PickupEndDt, SlotStartAt, SlotEndAt):
///   These are wall-clock business times (timezone-less), stored and compared as-is.
///   NO conversion to UTC in this service; values come from frontend as entered.
/// - Operational timestamps (CreatedAt, UpdatedAt, CancelledAt, OrderedAt):
///   These use DateTime.UtcNow for true UTC absolute moments.
/// - See README.md "Datetime Semantics" section for complete policy.
/// </summary>
public class MvpPreOrderService : IMvpPreOrderService
{
    private readonly AppDbContext _context;
    private readonly IAuditService _auditService;
    private readonly ILogger<MvpPreOrderService> _logger;

    public MvpPreOrderService(AppDbContext context, IAuditService auditService, ILogger<MvpPreOrderService> logger)
    {
        _context = context;
        _auditService = auditService;
        _logger = logger;
    }

    public async Task<List<HolidayEvent>> GetHolidayEventsAsync(Guid organizationId)
    {
        return await _context.HolidayEvents
            .Where(e => e.OrganizationId == organizationId && e.IsActive)
            .OrderBy(e => e.OpensAt)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<HolidayEvent> CreateHolidayEventAsync(Guid organizationId, CreateHolidayEventRequest request)
    {

        if (request.ClosesAt <= request.OpensAt)
        {
            throw new InvalidOperationException("Pre-order event close time must be after open time.");
        }

        if (request.PickupEndDt < request.PickupStartDt)
        {
            throw new InvalidOperationException("Pickup end date must be on or after pickup start date.");
        }
        if (request.PickupStartDt < request.OpensAt)
        {
            throw new InvalidOperationException("Pickup start date must be on or after pre-order event open time.");
        }

        var entity = new HolidayEvent
        {
            ExternalId = Guid.NewGuid(),
            OrganizationId = organizationId,
            Name = request.Name,
            Description = request.Description,
            OpensAt = DateTime.SpecifyKind(request.OpensAt, DateTimeKind.Local),
            ClosesAt = DateTime.SpecifyKind(request.ClosesAt, DateTimeKind.Local),
            PickupStartDt = DateTime.SpecifyKind(request.PickupStartDt, DateTimeKind.Local),
            PickupEndDt = DateTime.SpecifyKind(request.PickupEndDt, DateTimeKind.Local),

            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.HolidayEvents.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<HolidayEvent> UpdateHolidayEventAsync(Guid organizationId, Guid holidayEventExternalId, UpdateHolidayEventRequest request)
    {

        if (request.ClosesAt <= request.OpensAt)
        {
            throw new InvalidOperationException("Pre-order event close time must be after open time.");
        }

        if (request.PickupEndDt < request.PickupStartDt)
        {
            throw new InvalidOperationException("Pickup end date must be on or after pickup start date.");
        }
        var opensAtDate = DateOnly.FromDateTime(request.OpensAt);
        var pickupDate = DateOnly.FromDateTime(request.PickupStartDt);

        if (pickupDate < opensAtDate)
        {
            throw new InvalidOperationException("Pickup start date must be on or after pre-order event open time.");
        }

        var entity = await ResolveHolidayEventAsync(organizationId, holidayEventExternalId);

        entity.Name = request.Name;
        entity.Description = request.Description;
        entity.OpensAt = DateTime.SpecifyKind(request.OpensAt, DateTimeKind.Local);
        entity.ClosesAt = request.ClosesAt;
        entity.PickupStartDt = request.PickupStartDt;
        entity.PickupEndDt = request.PickupEndDt;
        entity.IsActive = request.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;

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
        long? sellableProductId;

        if (request.Price < 0)
        {
            throw new InvalidOperationException("Menu item price cannot be negative.");
        }

        if (request.MaxPerOrder.HasValue && request.MaxPerOrder.Value < 1)
        {
            throw new InvalidOperationException("Max-per-order must be at least 1 when provided.");
        }

        // if (request.ProductExternalId.HasValue && request.ProductExternalId.Value != Guid.Empty)
        // {
        //     sellableProductId = await _context.SellableProducts
        //         .Where(p => p.OrganizationId == organizationId && p.ExternalId == request.ProductExternalId.Value && p.IsActive && p.IsForSale)
        //         .Select(p => (long?)p.Id)
        //         .FirstOrDefaultAsync();

        //     if (!sellableProductId.HasValue)
        //     {
        //         throw new KeyNotFoundException($"Sellable product {request.ProductExternalId.Value} not found.");
        //     }
        // }
        // else
        // {
        //     sellableProductId = await ResolveUnlinkedSellableProductIdAsync(organizationId);
        // }
        sellableProductId = null;
        var entity = new MenuItem
        {
            ExternalId = Guid.NewGuid(),
            OrganizationId = organizationId,
            HolidayEventId = holidayEvent.Id,
            SellableProductId = sellableProductId,
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

    public async Task<MenuItem> UpdateMenuItemAsync(Guid organizationId, Guid menuItemExternalId, UpdateMenuItemRequest request)
    {
        if (request.Price < 0)
        {
            throw new InvalidOperationException("Menu item price cannot be negative.");
        }

        if (request.MaxPerOrder.HasValue && request.MaxPerOrder.Value < 1)
        {
            throw new InvalidOperationException("Max-per-order must be at least 1 when provided.");
        }

        var entity = await _context.MenuItems
            .FirstOrDefaultAsync(menuItem => menuItem.OrganizationId == organizationId && menuItem.ExternalId == menuItemExternalId);

        if (entity == null)
        {
            throw new KeyNotFoundException($"Menu item {menuItemExternalId} not found.");
        }

        var holidayEvent = await ResolveHolidayEventAsync(organizationId, request.HolidayEventExternalId);

        long? sellableProductId;
        // if (request.ProductExternalId.HasValue && request.ProductExternalId.Value != Guid.Empty)
        // {
        //     sellableProductId = await _context.SellableProducts
        //         .Where(product => product.OrganizationId == organizationId && product.ExternalId == request.ProductExternalId.Value && product.IsActive && product.IsForSale)
        //         .Select(product => (long?)product.Id)
        //         .FirstOrDefaultAsync();

        //     if (!sellableProductId.HasValue)
        //     {
        //         throw new KeyNotFoundException($"Sellable product {request.ProductExternalId.Value} not found.");
        //     }
        // }
        // else
        // {
        //     sellableProductId = await ResolveUnlinkedSellableProductIdAsync(organizationId);
        // }
        sellableProductId = null;

        entity.HolidayEventId = holidayEvent.Id;
        entity.SellableProductId = sellableProductId;
        entity.Name = request.Name;
        entity.Description = request.Description;
        entity.Price = request.Price;
        entity.MaxPerOrder = request.MaxPerOrder;
        entity.SortOrder = request.SortOrder;
        entity.IsActive = request.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<List<PickupSlot>> GetPickupSlotsAsync(Guid organizationId, Guid holidayEventExternalId)
    {
        var holidayEvent = await ResolveHolidayEventAsync(organizationId, holidayEventExternalId);

        return await _context.PickupSlots
            .Where(s => s.OrganizationId == organizationId && s.HolidayEventId == holidayEvent.Id && s.IsActive)
            .OrderBy(s => s.SlotStartAt)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<PickupSlot> CreatePickupSlotAsync(Guid organizationId, CreatePickupSlotRequest request)
    {
        if (request.SlotEndAt <= request.SlotStartAt)
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
            SlotStartAt = request.SlotStartAt,
            SlotEndAt = request.SlotEndAt,
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

    public async Task<PickupSlot> UpdatePickupSlotAsync(Guid organizationId, Guid pickupSlotExternalId, UpdatePickupSlotRequest request)
    {
        if (request.SlotEndAt <= request.SlotStartAt)
        {
            throw new InvalidOperationException("Pickup slot end time must be after start time.");
        }

        if (request.Capacity < 1)
        {
            throw new InvalidOperationException("Pickup slot capacity must be at least 1.");
        }

        var entity = await _context.PickupSlots
            .FirstOrDefaultAsync(slot => slot.OrganizationId == organizationId && slot.ExternalId == pickupSlotExternalId);

        if (entity == null)
        {
            throw new KeyNotFoundException($"Pickup slot {pickupSlotExternalId} not found.");
        }

        if (request.Capacity < entity.ReservedCount)
        {
            throw new InvalidOperationException($"Pickup slot capacity cannot be lower than currently reserved count ({entity.ReservedCount}).");
        }

        var holidayEvent = await ResolveHolidayEventAsync(organizationId, request.HolidayEventExternalId);

        entity.HolidayEventId = holidayEvent.Id;
        entity.SlotStartAt = request.SlotStartAt;
        entity.SlotEndAt = request.SlotEndAt;
        entity.Capacity = request.Capacity;
        entity.IsActive = request.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<List<PreOrder>> GetPreOrdersAsync(Guid organizationId, Guid? holidayEventExternalId = null)
    {
        Guid? requestedHolidayEventExternalId = null;
        var query = _context.Orders
            .Where(o => o.OrganizationId == organizationId)
            .AsQueryable();

        if (holidayEventExternalId.HasValue)
        {
            requestedHolidayEventExternalId = holidayEventExternalId.Value;
            var holidayEvent = await ResolveHolidayEventAsync(organizationId, holidayEventExternalId.Value);
            query = query.Where(o => o.HolidayEventId == holidayEvent.Id);
        }

        List<Order> orders;
        try
        {
            orders = await query
                .Include(o => o.OrderItems)
                .Include(o => o.PickupSlot)
                .OrderByDescending(o => o.CreatedAt)
                .AsNoTracking()
                .ToListAsync();
        }
        catch (InvalidCastException ex)
        {
            _logger.LogWarning(ex, "Falling back to preorder header-only read because legacy order_item product_id values are stored as text.");

            try
            {
                orders = await query
                    .Include(o => o.PickupSlot)
                    .OrderByDescending(o => o.CreatedAt)
                    .AsNoTracking()
                    .ToListAsync();
            }
            catch (PostgresException fallbackEx) when (IsLegacyTypeComparisonError(fallbackEx))
            {
                _logger.LogWarning(fallbackEx, "Returning safe empty preorder list because legacy varchar-vs-bigint comparisons still fail in fallback query path after an invalid cast failure.");
                return [];
            }
            catch (InvalidCastException fallbackEx)
            {
                _logger.LogWarning(fallbackEx, "Returning safe empty preorder list because legacy type drift still causes cast failures in fallback query path.");
                return [];
            }
        }
        catch (PostgresException ex) when (IsLegacyTypeComparisonError(ex))
        {
            _logger.LogWarning(ex, "Falling back to preorder header-only read because a legacy varchar FK is being compared to bigint in the order-item include path.");

            try
            {
                orders = await query
                    .Include(o => o.PickupSlot)
                    .OrderByDescending(o => o.CreatedAt)
                    .AsNoTracking()
                    .ToListAsync();
            }
            catch (PostgresException fallbackEx) when (IsLegacyTypeComparisonError(fallbackEx))
            {
                _logger.LogWarning(fallbackEx, "Returning safe empty preorder list because legacy varchar-vs-bigint comparisons still fail in header-only query path.");
                return [];
            }
            catch (InvalidCastException fallbackEx)
            {
                _logger.LogWarning(fallbackEx, "Returning safe empty preorder list because legacy type drift still causes cast failures in header-only query path.");
                return [];
            }
        }

        if (requestedHolidayEventExternalId.HasValue && orders.Count > 0)
        {
            var requestedEvent = await _context.HolidayEvents
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.OrganizationId == organizationId && e.ExternalId == requestedHolidayEventExternalId.Value);

            if (requestedEvent != null)
            {
                orders = orders.Where(o => o.HolidayEventId == requestedEvent.Id).ToList();
            }
        }

        return await MapOrdersToPreOrdersAsync(orders);
    }

    public async Task<string> ExportPreOrdersCsvAsync(Guid organizationId, Guid? holidayEventExternalId = null, DateTime? pickupDateUtc = null)
    {
        var query = _context.Orders
            .Where(order => order.OrganizationId == organizationId)
            .Include(order => order.HolidayEvent)
            .Include(order => order.PickupSlot)
            .AsQueryable();

        if (holidayEventExternalId.HasValue)
        {
            var holidayEvent = await ResolveHolidayEventAsync(organizationId, holidayEventExternalId.Value);
            query = query.Where(order => order.HolidayEventId == holidayEvent.Id);
        }

        if (pickupDateUtc.HasValue)
        {
            var targetDate = pickupDateUtc.Value.Date;
            query = query.Where(order => order.PickupSlot != null && order.PickupSlot.SlotStartAt.Date == targetDate);
        }

        List<Order> orders;
        try
        {
            orders = await query
                .Include(order => order.OrderItems)
                .OrderBy(order => order.PickupSlot!.SlotStartAt)
                .ThenBy(order => order.CreatedAt)
                .AsNoTracking()
                .ToListAsync();
        }
        catch (InvalidCastException ex)
        {
            _logger.LogWarning(ex, "Falling back to preorder CSV header-only export because legacy order_item product_id values are stored as text.");

            try
            {
                orders = await query
                    .OrderBy(order => order.PickupSlot!.SlotStartAt)
                    .ThenBy(order => order.CreatedAt)
                    .AsNoTracking()
                    .ToListAsync();
            }
            catch (PostgresException fallbackEx) when (IsLegacyTypeComparisonError(fallbackEx))
            {
                _logger.LogWarning(fallbackEx, "Returning header-only CSV because legacy varchar-vs-bigint comparisons still fail in fallback query path after an invalid cast failure.");
                return "OrderExternalId,CreatedAtUtc,Status,HolidayEventExternalId,HolidayEventName,PickupSlotExternalId,PickupStartUtc,PickupEndUtc,PickupDateUtc,CustomerName,CustomerEmail,CustomerPhone,Notes,TotalAmount,LineExternalId,MenuItemName,ProductId,Quantity,UnitPrice,LineTotal\n";
            }
            catch (InvalidCastException fallbackEx)
            {
                _logger.LogWarning(fallbackEx, "Returning header-only CSV because legacy type drift still causes cast failures in fallback query path.");
                return "OrderExternalId,CreatedAtUtc,Status,HolidayEventExternalId,HolidayEventName,PickupSlotExternalId,PickupStartUtc,PickupEndUtc,PickupDateUtc,CustomerName,CustomerEmail,CustomerPhone,Notes,TotalAmount,LineExternalId,MenuItemName,ProductId,Quantity,UnitPrice,LineTotal\n";
            }
        }
        catch (PostgresException ex) when (IsLegacyTypeComparisonError(ex))
        {
            _logger.LogWarning(ex, "Falling back to preorder CSV header-only export because a legacy varchar FK is being compared to bigint in the order-item include path.");

            orders = await query
                .OrderBy(order => order.PickupSlot!.SlotStartAt)
                .ThenBy(order => order.CreatedAt)
                .AsNoTracking()
                .ToListAsync();
        }

        var menuNameLookup = await BuildMenuNameLookupAsync(orders);
        return BuildPreOrderCsv(orders, menuNameLookup);
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

        await EnsureMenuItemsLinkedToProductsAsync(organizationId, menuItems.Values);

        var customerEmail = request.CustomerEmail.Trim();
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.OrganizationId == organizationId && c.IsActive && c.Email == customerEmail);

        if (customer == null)
        {
            customer = new Customer
            {
                ExternalId = Guid.NewGuid(),
                OrganizationId = organizationId,
                Name = request.CustomerName.Trim(),
                Email = customerEmail,
                Phone = string.IsNullOrWhiteSpace(request.CustomerPhone) ? null : request.CustomerPhone.Trim(),
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                VersionNbr = 1
            };

            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();
        }
        else
        {
            customer.Name = request.CustomerName.Trim();
            customer.Phone = string.IsNullOrWhiteSpace(request.CustomerPhone) ? customer.Phone : request.CustomerPhone.Trim();
            customer.UpdatedAt = DateTime.UtcNow;
        }

        var order = new Order
        {
            ExternalId = Guid.NewGuid(),
            OrganizationId = organizationId,
            CustomerId = customer.Id,
            CustomerName = request.CustomerName.Trim(),
            CustomerEmail = customerEmail,
            CustomerPhone = string.IsNullOrWhiteSpace(request.CustomerPhone) ? null : request.CustomerPhone.Trim(),
            HolidayEventId = holidayEvent.Id,
            PickupSlotId = pickupSlot.Id,
            OrderDate = DateTime.UtcNow,
            OrderStatus = "SUBMITTED",
            SpecialInstructionTxt = request.Notes,
            OrderedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            VersionNbr = 1
        };

        decimal total = 0;
        foreach (var line in request.Lines)
        {
            if (!menuItems.TryGetValue(line.MenuItemExternalId, out var menuItem))
            {
                throw new KeyNotFoundException($"Menu item not found for external id {line.MenuItemExternalId}");
            }

            if (!menuItem.SellableProductId.HasValue)
            {
                throw new InvalidOperationException($"Menu item '{menuItem.Name}' is not linked to a sellable product. Link it in admin before accepting preorders for this item.");
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

            order.OrderItems.Add(new OrderItem
            {
                ExternalId = Guid.NewGuid(),
                MenuItemId = menuItem.Id,
                Quantity = line.Quantity,
                UnitPrice = menuItem.Price,
                OrderItemStatus = "PENDING",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                VersionNbr = 1
            });
        }

        order.TotalAmount = total;
        pickupSlot.ReservedCount += 1;
        pickupSlot.UpdatedAt = DateTime.UtcNow;

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Preorder {ExternalId} created in customer_order for event {HolidayEventId}", order.ExternalId, holidayEvent.ExternalId);

        return await MapOrderToPreOrderAsync(order);
    }

    public async Task<PreOrder> UpdatePreOrderStatusAsync(Guid organizationId, Guid preOrderExternalId, string nextStatus, Guid? changedByUserId = null, string? ipAddress = null, string? userAgent = null)
    {
        var normalizedStatus = NormalizePreOrderStatus(nextStatus);

        var order = await _context.Orders
            .Include(o => o.OrderItems)
            .FirstOrDefaultAsync(o => o.OrganizationId == organizationId && o.ExternalId == preOrderExternalId);

        if (order == null)
        {
            throw new KeyNotFoundException($"Preorder {preOrderExternalId} not found.");
        }

        if (order.OrderStatus == normalizedStatus)
        {
            return await MapOrderToPreOrderAsync(order);
        }

        if (!CanTransitionPreOrderStatus(order.OrderStatus, normalizedStatus))
        {
            throw new InvalidOperationException($"Cannot change preorder status from {order.OrderStatus} to {normalizedStatus}.");
        }

        if (normalizedStatus == "CANCELLED" && order.PickupSlotId.HasValue)
        {
            var pickupSlot = await _context.PickupSlots.FirstOrDefaultAsync(s => s.Id == order.PickupSlotId.Value && s.OrganizationId == organizationId);
            if (pickupSlot != null)
            {
                pickupSlot.ReservedCount = Math.Max(0, pickupSlot.ReservedCount - 1);
                pickupSlot.UpdatedAt = DateTime.UtcNow;
            }

            order.CancelledAt = DateTime.UtcNow;
        }

        order.OrderStatus = normalizedStatus;
        order.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _auditService.LogEventAsync(
            action: $"PreOrderStatusChanged:{normalizedStatus}",
            userId: changedByUserId,
            organizationId: organizationId,
            entityType: nameof(Order),
            entityId: order.ExternalId.ToString(),
            ipAddress: ipAddress,
            userAgent: userAgent,
            details: $"Preorder status changed to {normalizedStatus}");

        _logger.LogInformation("Preorder {ExternalId} status changed to {Status} in customer_order", order.ExternalId, order.OrderStatus);

        return await MapOrderToPreOrderAsync(order);
    }

    private async Task<List<PreOrder>> MapOrdersToPreOrdersAsync(List<Order> orders)
    {
        if (orders.Count == 0)
        {
            return [];
        }

        return orders.Select(MapOrderToPreOrder).ToList();
    }

    private async Task<PreOrder> MapOrderToPreOrderAsync(Order order)
    {
        return await Task.FromResult(MapOrderToPreOrder(order));
    }

    private async Task<Dictionary<long, string>> BuildMenuNameLookupAsync(IEnumerable<Order> orders)
    {
        var menuItemIds = orders
            .SelectMany(order => order.OrderItems)
            .Select(item => item.MenuItemId)
            .Distinct()
            .ToList();

        if (menuItemIds.Count == 0)
        {
            return new Dictionary<long, string>();
        }

        try
        {
            return await _context.MenuItems
                .Where(menuItem => menuItemIds.Contains(menuItem.Id))
                .ToDictionaryAsync(menuItem => menuItem.Id, menuItem => menuItem.Name);
        }
        catch (InvalidCastException ex)
        {
            _logger.LogWarning(ex, "Falling back to empty menu-name lookup because menu item ids could not be materialized as bigint.");
            return new Dictionary<long, string>();
        }
        catch (PostgresException ex) when (IsLegacyTypeComparisonError(ex))
        {
            _logger.LogWarning(ex, "Falling back to empty menu-name lookup because legacy type drift blocks menu-item lookup.");
            return new Dictionary<long, string>();
        }
    }

    private async Task EnsureMenuItemsLinkedToProductsAsync(Guid organizationId, IEnumerable<MenuItem> menuItems)
    {
        var unresolved = menuItems
            .Where(menuItem => !menuItem.SellableProductId.HasValue)
            .ToList();

        if (unresolved.Count == 0)
        {
            return;
        }

        var products = await _context.SellableProducts
            .Where(product => product.OrganizationId == organizationId && product.IsActive && product.IsForSale)
            .Select(product => new { product.Id, product.Name })
            .ToListAsync();

        var uniqueProductIdsByName = products
            .GroupBy(product => NormalizeLookupName(product.Name))
            .Where(group => group.Count() == 1)
            .ToDictionary(group => group.Key, group => group.First().Id);

        if (!uniqueProductIdsByName.TryGetValue(UnlinkedSellableProductName, out var unlinkedProductId))
        {
            throw new InvalidOperationException("Sellable product 'Unlinked' must exist as an active for-sale product before preorders can use default product linking.");
        }

        foreach (var menuItem in unresolved)
        {
            var normalizedMenuItemName = NormalizeLookupName(menuItem.Name);
            if (uniqueProductIdsByName.TryGetValue(normalizedMenuItemName, out var productId))
            {
                menuItem.SellableProductId = productId;
                menuItem.UpdatedAt = DateTime.UtcNow;
                continue;
            }

            menuItem.SellableProductId = unlinkedProductId;
            menuItem.UpdatedAt = DateTime.UtcNow;
            _logger.LogWarning("Menu item {MenuItemName} was automatically linked to the Unlinked sellable product for organization {OrganizationId}.", menuItem.Name, organizationId);
        }
    }

    // private async Task<long> ResolveUnlinkedSellableProductIdAsync(Guid organizationId)
    // {
    //     var productId = await _context.SellableProducts
    //         .Where(product => product.OrganizationId == organizationId
    //             && product.Name.Trim().ToUpper() == UnlinkedSellableProductName)
    //         .Select(product => (long?)product.Id)
    //         .FirstOrDefaultAsync();

    //     if (!productId.HasValue)
    //     {
    //         throw new InvalidOperationException("Sellable product 'Unlinked' must exist as an active for-sale product before menu items can default to it.");
    //     }

    //     return productId.Value;
    // }

    private const string UnlinkedSellableProductName = "UNLINKED";

    private static string NormalizeLookupName(string value)
    {
        return value.Trim().ToUpperInvariant();
    }

    private static bool IsLegacyTypeComparisonError(PostgresException ex)
    {
        return ex.SqlState == "42883"
            && ex.MessageText.Contains("operator does not exist", StringComparison.OrdinalIgnoreCase)
            && ex.MessageText.Contains("character varying = bigint", StringComparison.OrdinalIgnoreCase);
    }

    private static string BuildPreOrderCsv(
        IReadOnlyCollection<Order> orders,
        IReadOnlyDictionary<long, string> menuNameLookup)
    {
        var builder = new StringBuilder();
        builder.AppendLine("OrderExternalId,CreatedAtUtc,Status,HolidayEventExternalId,HolidayEventName,PickupSlotExternalId,PickupStartUtc,PickupEndUtc,PickupDateUtc,CustomerName,CustomerEmail,CustomerPhone,Notes,TotalAmount,LineExternalId,MenuItemName,MenuItemId,Quantity,UnitPrice,LineTotal");

        foreach (var order in orders)
        {
            if (order.OrderItems.Count == 0)
            {
                AppendCsvRow(builder, order, null, null, menuNameLookup);
                continue;
            }

            foreach (var orderItem in order.OrderItems)
            {
                AppendCsvRow(builder, order, orderItem, order.HolidayEventId, menuNameLookup);
            }
        }

        return builder.ToString();
    }

    private static void AppendCsvRow(
        StringBuilder builder,
        Order order,
        OrderItem? orderItem,
        long? holidayEventId,
        IReadOnlyDictionary<long, string> menuNameLookup)
    {
        var menuItemName = string.Empty;
        if (orderItem != null && menuNameLookup.TryGetValue(orderItem.MenuItemId, out var resolvedName))
        {
            menuItemName = resolvedName;
        }

        var pickupDate = order.PickupSlot?.SlotStartAt.Date;
        var lineTotal = orderItem != null ? orderItem.UnitPrice * orderItem.Quantity : 0m;

        var columns = new[]
        {
            order.ExternalId.ToString(),
            FormatUtc(order.CreatedAt),
            order.OrderStatus,
            order.HolidayEvent?.ExternalId.ToString() ?? string.Empty,
            order.HolidayEvent?.Name ?? string.Empty,
            order.PickupSlot?.ExternalId.ToString() ?? string.Empty,
            order.PickupSlot != null ? FormatUtc(order.PickupSlot.SlotStartAt) : string.Empty,
            order.PickupSlot != null ? FormatUtc(order.PickupSlot.SlotEndAt) : string.Empty,
            pickupDate?.ToString("yyyy-MM-dd") ?? string.Empty,
            order.CustomerName,
            order.CustomerEmail,
            order.CustomerPhone ?? string.Empty,
            order.SpecialInstructionTxt ?? string.Empty,
            order.TotalAmount.ToString("0.00"),
            orderItem?.ExternalId.ToString() ?? string.Empty,
            menuItemName,
            orderItem?.MenuItemId.ToString() ?? string.Empty,
            orderItem?.Quantity.ToString() ?? string.Empty,
            orderItem?.UnitPrice.ToString("0.00") ?? string.Empty,
            orderItem != null ? lineTotal.ToString("0.00") : string.Empty
        };

        builder.AppendLine(string.Join(',', columns.Select(EscapeCsv)));
    }

    private static string FormatUtc(DateTime value)
    {
        return value.ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss'Z'");
    }

    private static string EscapeCsv(string value)
    {
        if (value.Contains('"'))
        {
            value = value.Replace("\"", "\"\"");
        }

        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
        {
            return $"\"{value}\"";
        }

        return value;
    }

    private static PreOrder MapOrderToPreOrder(Order order)
    {
        var holidayEventId = order.HolidayEventId ?? 0;
        var pickupSlotId = order.PickupSlotId ?? 0;

        return new PreOrder
        {
            Id = order.Id,
            ExternalId = order.ExternalId,
            OrganizationId = order.OrganizationId,
            HolidayEventId = holidayEventId,
            PickupSlotId = pickupSlotId,
            CustomerName = order.CustomerName,
            CustomerEmail = order.CustomerEmail,
            CustomerPhone = order.CustomerPhone,
            Notes = order.SpecialInstructionTxt,
            Status = order.OrderStatus,
            TotalAmount = order.TotalAmount,
            CreatedAt = order.CreatedAt,
            UpdatedAt = order.UpdatedAt,
            PickupSlot = MapPickupSlotSnapshot(order.PickupSlot),
            Lines = order.OrderItems.Select(item => new PreOrderLine
            {
                Id = item.Id,
                ExternalId = item.ExternalId,
                PreOrderId = order.Id,
                MenuItemId = item.MenuItemId,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice
            }).ToList()
        };
    }

    private static PickupSlot? MapPickupSlotSnapshot(PickupSlot? slot)
    {
        if (slot == null)
        {
            return null;
        }

        return new PickupSlot
        {
            Id = slot.Id,
            ExternalId = slot.ExternalId,
            OrganizationId = slot.OrganizationId,
            HolidayEventId = slot.HolidayEventId,
            SlotStartAt = slot.SlotStartAt,
            SlotEndAt = slot.SlotEndAt,
            Capacity = slot.Capacity,
            ReservedCount = slot.ReservedCount,
            IsActive = slot.IsActive,
            CreatedAt = slot.CreatedAt,
            UpdatedAt = slot.UpdatedAt
        };
    }

    private async Task<HolidayEvent> ResolveHolidayEventAsync(Guid organizationId, Guid holidayEventExternalId)
    {
        var holidayEvent = await _context.HolidayEvents
            .FirstOrDefaultAsync(e => e.OrganizationId == organizationId && e.ExternalId == holidayEventExternalId);

        if (holidayEvent == null)
        {
            throw new KeyNotFoundException($"Pre-Order event {holidayEventExternalId} not found.");
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

    private static string NormalizePreOrderStatus(string status)
    {
        var normalized = status.Trim().ToUpperInvariant();

        return normalized switch
        {
            "CONFIRMED" => "CONFIRMED",
            "CANCELLED" => "CANCELLED",
            _ => throw new InvalidOperationException($"Unsupported preorder status '{status}'. Allowed values: CONFIRMED, CANCELLED.")
        };
    }

    private static bool CanTransitionPreOrderStatus(string currentStatus, string nextStatus)
    {
        var normalizedCurrent = currentStatus.Trim().ToUpperInvariant();

        return normalizedCurrent switch
        {
            "SUBMITTED" when nextStatus is "CONFIRMED" or "CANCELLED" => true,
            "CONFIRMED" when nextStatus == "CANCELLED" => true,
            _ => false
        };
    }
}
