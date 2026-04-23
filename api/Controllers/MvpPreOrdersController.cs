using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

    [HttpGet("holiday-events")]
    public async Task<IActionResult> GetHolidayEvents()
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var events = await _service.GetHolidayEventsAsync(organizationId);
        return Ok(events);
    }

    [HttpPost("holiday-events")]
    [RequireTenantAdmin]
    public async Task<IActionResult> CreateHolidayEvent([FromBody] CreateHolidayEventRequest request)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var entity = await _service.CreateHolidayEventAsync(organizationId, request);
        return Ok(entity);
    }

    [HttpGet("menu-items")]
    public async Task<IActionResult> GetMenuItems([FromQuery] Guid holidayEventExternalId)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var items = await _service.GetMenuItemsAsync(organizationId, holidayEventExternalId);
        return Ok(items);
    }

    [HttpPost("menu-items")]
    [RequireTenantAdmin]
    public async Task<IActionResult> CreateMenuItem([FromBody] CreateMenuItemRequest request)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var entity = await _service.CreateMenuItemAsync(organizationId, request);
        return Ok(entity);
    }

    [HttpGet("pickup-slots")]
    public async Task<IActionResult> GetPickupSlots([FromQuery] Guid holidayEventExternalId)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var slots = await _service.GetPickupSlotsAsync(organizationId, holidayEventExternalId);
        return Ok(slots);
    }

    [HttpPost("pickup-slots")]
    [RequireTenantAdmin]
    public async Task<IActionResult> CreatePickupSlot([FromBody] CreatePickupSlotRequest request)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var entity = await _service.CreatePickupSlotAsync(organizationId, request);
        return Ok(entity);
    }

    [HttpGet("preorders")]
    [RequireTenantAdmin]
    public async Task<IActionResult> GetPreOrders([FromQuery] Guid? holidayEventExternalId)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var preorders = await _service.GetPreOrdersAsync(organizationId, holidayEventExternalId);
        return Ok(preorders);
    }

    [HttpPost("preorders")]
    public async Task<IActionResult> CreatePreOrder([FromBody] CreatePreOrderRequest request)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var preorder = await _service.CreatePreOrderAsync(organizationId, request);
        return Ok(preorder);
    }
}
