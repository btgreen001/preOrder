using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using PreOrderApp.Data;
using PreOrderApp.Filters;
using PreOrderApp.Services;
using PreOrderApp.Services.Interfaces;
using PreOrderApp.DTOs;

namespace PreOrderApp.Controllers;

[ApiController]
[Route("api/mvp")]
[Authorize]
[ValidateTenantAccess]
public class MvpPreOrdersController : ControllerBase
{
    private readonly IMvpPreOrderService _service;
    private readonly IOrganizationContextService _orgContext;
    private readonly IEmailService _emailService;
    private readonly AppDbContext _context;

    public MvpPreOrdersController(
        IMvpPreOrderService service,
        IOrganizationContextService orgContext,
        IEmailService emailService,
        AppDbContext context)
    {
        _service = service;
        _orgContext = orgContext;
        _emailService = emailService;
        _context = context;
    }

    [HttpGet("preorder-event/all")]
    public async Task<IActionResult> GetAllHolidayEvents()
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var events = await _service.GetAllHolidayEventsAsync(organizationId);
        return Ok(events.Select(MapHolidayEvent));
    }

    [HttpPost("preorder-event")]
    [RequireTenantStaffOrAdmin]
    public async Task<IActionResult> CreateHolidayEvent([FromBody] CreateHolidayEventRequest request)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();

        try
        {
            var entity = await _service.CreateHolidayEventAsync(organizationId, request);
            return Ok(MapHolidayEvent(entity));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPut("preorder-event/{holidayEventExternalId:guid}")]
    [RequireTenantStaffOrAdmin]
    public async Task<IActionResult> UpdateHolidayEvent(Guid holidayEventExternalId, [FromBody] UpdateHolidayEventRequest request)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();

        try
        {
            var entity = await _service.UpdateHolidayEventAsync(organizationId, holidayEventExternalId, request);
            return Ok(MapHolidayEvent(entity));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpGet("menu-items")]
    public async Task<IActionResult> GetMenuItems([FromQuery] Guid holidayEventExternalId)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var items = await _service.GetMenuItemsAsync(organizationId, holidayEventExternalId);
        return Ok(items.Select(MapMenuItem));
    }

    [HttpPost("menu-items")]
    [RequireTenantStaffOrAdmin]

    public async Task<IActionResult> CreateMenuItem([FromBody] CreateMenuItemRequest request)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var entity = await _service.CreateMenuItemAsync(organizationId, request);
        return Ok(MapMenuItem(entity));
    }

    [HttpPut("menu-items/{menuItemExternalId:guid}")]
    [RequireTenantStaffOrAdmin]

    public async Task<IActionResult> UpdateMenuItem(Guid menuItemExternalId, [FromBody] UpdateMenuItemRequest request)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();

        try
        {
            var entity = await _service.UpdateMenuItemAsync(organizationId, menuItemExternalId, request);
            return Ok(MapMenuItem(entity));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpGet("pickup-slots")]
    public async Task<IActionResult> GetPickupSlots([FromQuery] Guid holidayEventExternalId)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var slots = await _service.GetPickupSlotsAsync(organizationId, holidayEventExternalId);
        return Ok(slots.Select(MapPickupSlot));
    }

    [HttpPost("pickup-slots")]
    [RequireTenantStaffOrAdmin]
    public async Task<IActionResult> CreatePickupSlot([FromBody] CreatePickupSlotRequest request)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var entity = await _service.CreatePickupSlotAsync(organizationId, request);
        return Ok(MapPickupSlot(entity));
    }

    [HttpPut("pickup-slots/{pickupSlotExternalId:guid}")]
    [RequireTenantStaffOrAdmin]
    public async Task<IActionResult> UpdatePickupSlot(Guid pickupSlotExternalId, [FromBody] UpdatePickupSlotRequest request)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();

        try
        {
            var entity = await _service.UpdatePickupSlotAsync(organizationId, pickupSlotExternalId, request);
            return Ok(MapPickupSlot(entity));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpGet("preorders")]
    [RequireTenantStaffOrAdmin]
    public async Task<IActionResult> GetPreOrders([FromQuery] Guid? holidayEventExternalId)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var preorders = await _service.GetPreOrdersAsync(organizationId, holidayEventExternalId);
        return Ok(preorders);
    }

    [HttpGet("preorders/export.csv")]
    [RequireTenantStaffOrAdmin]
    public async Task<IActionResult> ExportPreOrdersCsv([FromQuery] Guid? holidayEventExternalId, [FromQuery] DateTime? pickupDateUtc)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var csv = await _service.ExportPreOrdersCsvAsync(organizationId, holidayEventExternalId, pickupDateUtc);
        var fileName = $"preorders-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv";
        return File(Encoding.UTF8.GetBytes(csv), "text/csv", fileName);
    }

    [HttpPost("preorders")]
    public async Task<IActionResult> CreatePreOrder([FromBody] CreatePreOrderRequest request)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var preorder = await _service.CreatePreOrderAsync(organizationId, request);
        return Ok(preorder);
    }

    [HttpPost("preorders/send-order-email")]
    [RequireTenantStaffOrAdmin]
    public async Task<IActionResult> SendOrderEmail([FromBody] SendOrderEmailDto request)
    {
        if (string.IsNullOrWhiteSpace(request.CustomerEmail) || string.IsNullOrWhiteSpace(request.CustomerName))
        {
            return BadRequest(new { message = "Customer name and email are required." });
        }

        var organizationId = _orgContext.GetCurrentOrganizationId();
        var org = await _context.Organizations
            .Where(o => o.OrganizationId == organizationId)
            .Select(o => new
            {
                o.OrganizationName,
                o.AddressLine1,
                o.AddressLine2,
                City = o.Locality,
                State = o.Region,
                o.ContactPhone,
                ContactEmail = o.PrimaryEmail
            })
            .FirstOrDefaultAsync();

        if (org == null || string.IsNullOrWhiteSpace(org.OrganizationName))
        {
            return NotFound(new { message = "Organization not found." });
        }

        var organizationName = org.OrganizationName;

        var slotStartAt = request.SlotStartAt;
        var slotEndAt = request.SlotEndAt;
        if (Guid.TryParse(request.OrderExternalId, out var orderExternalId))
        {
            var slotFromOrder = await _context.Orders
                .AsNoTracking()
                .Where(o => o.OrganizationId == organizationId && o.ExternalId == orderExternalId && o.PickupSlot != null)
                .Select(o => new
                {
                    SlotStartAt = (DateTime?)o.PickupSlot!.SlotStartAt,
                    SlotEndAt = (DateTime?)o.PickupSlot!.SlotEndAt
                })
                .FirstOrDefaultAsync();

            if (slotFromOrder?.SlotStartAt.HasValue == true && slotFromOrder.SlotEndAt.HasValue)
            {
                slotStartAt = slotFromOrder.SlotStartAt.Value;
                slotEndAt = slotFromOrder.SlotEndAt.Value;
            }
        }

        var line1 = org.AddressLine1?.Trim();
        var line2 = org.AddressLine2?.Trim();
        await _emailService.SendOrderEmailAsync(
            request.CustomerEmail,
            organizationName,
            org.ContactEmail,
            request.CustomerName,
            request.OrderExternalId,
            slotStartAt,
            slotEndAt,
            request.Lines.Select(line => new OrderEmailLineItem
            {
                Name = line.Name,
                Quantity = line.Quantity,
                UnitPrice = line.UnitPrice
            }),
            pickupAddress: !string.IsNullOrWhiteSpace(line1)
                ? (!string.IsNullOrWhiteSpace(line2) ? $"{line1}, {line2}" : line1)
                : (line2 ?? ""),
            pickupCity: org.City,
            pickupState: org.State,
            contactPhone: org.ContactPhone,
            contactEmail: org.ContactEmail);

        return Ok(new { message = "Order confirmation email sent." });
    }

    [HttpPatch("preorders/{preOrderExternalId:guid}/status")]
    [RequireTenantStaffOrAdmin]
    public async Task<IActionResult> UpdatePreOrderStatus(Guid preOrderExternalId, [FromBody] UpdatePreOrderStatusRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Status))
        {
            return BadRequest(new { message = "Status is required." });
        }

        var organizationId = _orgContext.GetCurrentOrganizationId();
        var userId = _orgContext.GetCurrentUserId();

        try
        {
            var preorder = await _service.UpdatePreOrderStatusAsync(
                organizationId,
                preOrderExternalId,
                request.Status,
                userId,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                Request.Headers.UserAgent.ToString());

            return Ok(new
            {
                preorder.ExternalId,
                preorder.Status,
                preorder.UpdatedAt
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    private static object MapHolidayEvent(Models.HolidayEvent e)
    {
        return new
        {
            e.Id,
            e.ExternalId,
            e.OrganizationId,
            e.Name,
            e.Description,
            e.OpensAt,
            e.ClosesAt,
            e.PickupStartDt,
            e.PickupEndDt,
            e.IsActive,
            e.CreatedAt,
            e.UpdatedAt
        };
    }

    private static object MapMenuItem(Models.MenuItem m)
    {
        return new
        {
            m.Id,
            m.ExternalId,
            m.OrganizationId,
            m.HolidayEventId,
            m.SellableProductId,
            m.Name,
            m.Description,
            m.Price,
            m.MaxPerOrder,
            m.IsActive,
            m.SortOrder,
            m.CreatedAt,
            m.UpdatedAt
        };
    }

    private static object MapPickupSlot(Models.PickupSlot s)
    {
        return new
        {
            s.Id,
            s.ExternalId,
            s.OrganizationId,
            s.HolidayEventId,
            s.SlotStartAt,
            s.SlotEndAt,
            s.Capacity,
            s.ReservedCount,
            s.IsActive,
            s.CreatedAt,
            s.UpdatedAt
        };
    }
}
