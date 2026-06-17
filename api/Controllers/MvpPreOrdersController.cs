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
    private readonly ILogger<OrdersController> _logger;

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

    [HttpPost("preorders/send-order-email/{orderExternalId:guid}")]
    [RequireTenantStaffOrAdmin]
    public async Task<IActionResult> SendOrderEmail([FromRoute] Guid orderExternalId)
    {
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

        var order = await _context.Orders
            .AsNoTracking()
            .Where(o => o.OrganizationId == organizationId &&
                        o.ExternalId == orderExternalId)
            .Select(o => new
            {
                o.Id,
                o.ExternalId,
                o.CustomerEmail,
                o.CustomerName,

                SlotStartAt = o.PickupSlot != null ? (DateTime?)o.PickupSlot.SlotStartAt : null,
                SlotEndAt   = o.PickupSlot != null ? (DateTime?)o.PickupSlot.SlotEndAt   : null,

                Lines = o.OrderItems.Select(l => new OrderEmailLineItem
                {
                    Name =
                        l.MenuItem != null ? l.MenuItem.Name :
                        l.SellableProduct != null ? l.SellableProduct.Name :
                        "(Unknown Item)",
                    Quantity = l.Quantity,
                    UnitPrice = l.UnitPrice
                }).ToList()
            })
            .FirstOrDefaultAsync();

        if (order is null)
        {
            // handle not found
            return NotFound(new { message = "Order not found." });
        }

        DateTime? slotStartAt = null;
        DateTime? slotEndAt = null;

        if (order.SlotStartAt.HasValue && order.SlotEndAt.HasValue)
        {
            slotStartAt = order.SlotStartAt.Value;
            slotEndAt = order.SlotEndAt.Value;
        }

        var line1 = org.AddressLine1?.Trim();
        var line2 = org.AddressLine2?.Trim();
        await _emailService.SendOrderEmailAsync(
            order.CustomerEmail,
            organizationName,
            org.ContactEmail,
            order.CustomerName,
            order.Id.ToString(),  // You can format this as needed
            order.ExternalId.ToString(),
            slotStartAt,
            slotEndAt,
            order.Lines.Select(line => new OrderEmailLineItem
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

    // POST api/mvp/preorders/{externalId}/override-status
    [HttpPost("preorders/{externalId}/override-status")]
    [RequireTenantAdmin]
    public async Task<IActionResult> OverrideStatus([FromRoute] string externalId, [FromBody] OverrideStatusRequest request, CancellationToken ct)
    {
        try
        {
            var organizationId = _orgContext.GetCurrentOrganizationId();
            // Determine the user performing the override. Adjust to your auth setup.
            var performedBy = User?.Identity?.Name ?? "system";
            var result = await _service.OverrideStatusAsync(organizationId, Guid.Parse(externalId), request, performedBy, ct);
            
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Preorder not found." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error overriding status for {ExternalId}", externalId);
            return StatusCode(500, new { message = "An error occurred while overriding status." });
        }
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
