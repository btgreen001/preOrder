using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PreOrderApp.Data;
using PreOrderApp.Services.Interfaces;

namespace PreOrderApp.Controllers;

[ApiController]
[Route("api/public/preorders")]
[AllowAnonymous]
public class PublicPreOrdersController : ControllerBase
{
    private readonly IMvpPreOrderService _service;
    private readonly AppDbContext _context;
    private readonly ILogger<PublicPreOrdersController> _logger;

    public PublicPreOrdersController(IMvpPreOrderService service, AppDbContext context, ILogger<PublicPreOrdersController> logger)
    {
        _service = service;
        _context = context;
        _logger = logger;
    }

    [HttpGet("preorder-event")]
    public async Task<IActionResult> GetHolidayEvents([FromQuery(Name = "org")] string organizationToken)
    {
        var organization = await TryResolveOrganizationAsync(organizationToken);
        if (organization.error != null)
        {
            return organization.error;
        }

        var events = await _service.GetHolidayEventsAsync(organization.organizationId);
        return Ok(events.Select(MapHolidayEvent));
    }

    [HttpGet("menu-items")]
    public async Task<IActionResult> GetMenuItems(
        [FromQuery(Name = "org")] string organizationToken,
        [FromQuery] Guid holidayEventExternalId)
    {
        var organization = await TryResolveOrganizationAsync(organizationToken);
        if (organization.error != null)
        {
            return organization.error;
        }

        var items = await _service.GetMenuItemsAsync(organization.organizationId, holidayEventExternalId);
        return Ok(items.Select(MapMenuItem));
    }

    [HttpGet("pickup-slots")]
    public async Task<IActionResult> GetPickupSlots(
        [FromQuery(Name = "org")] string organizationToken,
        [FromQuery] Guid holidayEventExternalId)
    {
        var organization = await TryResolveOrganizationAsync(organizationToken);
        if (organization.error != null)
        {
            return organization.error;
        }

        var slots = await _service.GetPickupSlotsAsync(organization.organizationId, holidayEventExternalId);
        return Ok(slots.Select(MapPickupSlot));
    }

    [HttpPost("preorders")]
    public async Task<IActionResult> CreatePreOrder(
        [FromQuery(Name = "org")] string organizationToken,
        [FromBody] CreatePreOrderRequest request)
    {
        var organization = await TryResolveOrganizationAsync(organizationToken);
        if (organization.error != null)
        {
            return organization.error;
        }

        var preorder = await _service.CreatePreOrderAsync(organization.organizationId, request);
        return Ok(MapPreOrder(preorder));
    }

    private async Task<(Guid organizationId, IActionResult? error)> TryResolveOrganizationAsync(string organizationToken)
    {
        if (string.IsNullOrWhiteSpace(organizationToken))
        {
            return (Guid.Empty, BadRequest(new { message = "Organization token is required." }));
        }

        var organizationId = await _context.Organizations
            .AsNoTracking()
            .Where(o => o.IsEnabled && o.RegistrationToken == organizationToken)
            .Select(o => o.OrganizationId)
            .FirstOrDefaultAsync();

        if (organizationId == Guid.Empty)
        {
            _logger.LogWarning("Public preorder request used an invalid organization token");
            return (Guid.Empty, NotFound(new { message = "Organization not found for the provided token." }));
        }

        return (organizationId, null);
    }

    private static object MapHolidayEvent(Models.HolidayEvent e) => new
    {
        e.ExternalId,
        e.Name,
        e.Description,
        e.OpensAt,
        e.ClosesAt,
        e.PickupStartDt,
        e.PickupEndDt,
        e.IsActive
    };

    private static object MapMenuItem(Models.MenuItem m) => new
    {
        m.ExternalId,
        m.HolidayEventId,
        m.Name,
        m.Description,
        m.Price,
        m.MaxPerOrder,
        m.IsActive,
        m.SortOrder
    };

    private static object MapPickupSlot(Models.PickupSlot s) => new
    {
        s.ExternalId,
        s.HolidayEventId,
        s.SlotStartAt,
        s.SlotEndAt,
        s.Capacity,
        s.ReservedCount,
        s.IsActive
    };

    private static object MapPreOrder(Models.PreOrder p) => new
    {
        p.ExternalId,
        p.HolidayEventId,
        p.PickupSlotId,
        p.CustomerName,
        p.CustomerEmail,
        p.CustomerPhone,
        p.Notes,
        p.Status,
        p.TotalAmount,
        p.CreatedAt,
        Lines = p.Lines.Select(l => new
        {
            l.ExternalId,
            l.MenuItemId,
            l.Quantity,
            l.UnitPrice,
            LineTotal = l.UnitPrice * l.Quantity
        })
    };
}
