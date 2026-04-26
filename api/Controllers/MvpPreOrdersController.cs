using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text;
using PreOrderApp.Filters;
using PreOrderApp.Services;
using PreOrderApp.Services.Interfaces;

namespace PreOrderApp.Controllers;

[ApiController]
[Route("api/mvp")]
[Authorize]
[ValidateTenantAccess]
public class MvpPreOrdersController : ControllerBase
{
    private readonly IMvpPreOrderService _service;
    private readonly IOrganizationContextService _orgContext;

    public MvpPreOrdersController(IMvpPreOrderService service, IOrganizationContextService orgContext)
    {
        _service = service;
        _orgContext = orgContext;
    }

    [HttpGet("preorder-event")]
    public async Task<IActionResult> GetHolidayEvents()
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var events = await _service.GetHolidayEventsAsync(organizationId);
        return Ok(events.Select(MapHolidayEvent));
    }

    [HttpPost("preorder-event")]
    [RequireTenantStaffOrAdmin]
    public async Task<IActionResult> CreateHolidayEvent([FromBody] CreateHolidayEventRequest request)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var entity = await _service.CreateHolidayEventAsync(organizationId, request);
        return Ok(MapHolidayEvent(entity));
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
