using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PreOrderApp.Data;
using PreOrderApp.Services;
using PreOrderApp.Services.Interfaces;
using PreOrderApp.DTOs;

namespace PreOrderApp.Controllers;

[ApiController]
[Route("api/public/preorders")]
[AllowAnonymous]
public class PublicPreOrdersController : ControllerBase
{
    private readonly IMvpPreOrderService _service;
    private readonly IOrderService _orderService;
    private readonly AppDbContext _context;
    private readonly IEmailService _emailService;
    private readonly ILogger<PublicPreOrdersController> _logger;

    public PublicPreOrdersController(
        IMvpPreOrderService service,
        IOrderService orderService,
        AppDbContext context,
        IEmailService emailService,
        ILogger<PublicPreOrdersController> logger)
    {
        _service = service;
        _orderService = orderService;
        _context = context;
        _emailService = emailService;
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

    [HttpGet("organization-details")]
    public async Task<IActionResult> GetOrganizationDetails([FromQuery(Name = "org")] string organizationToken)
    {
        var organization = await TryResolveOrganizationAsync(organizationToken);
        if (organization.error != null)
        {
            return organization.error;
        }

        var organizationDetails = await _context.Organizations
            .AsNoTracking()
            .Where(o => o.OrganizationId == organization.organizationId)
            .Select(o => new
            {
                o.OrganizationId,
                OrganizationName = o.OrganizationName,
                o.RegistrationToken,
                o.AddressLine1,
                o.AddressLine2,
                City = o.Locality,
                State = o.Region,
                o.PostalCode,
                Country = o.CountryCode,
                ContactEmail = o.PrimaryEmail,
                o.ContactPhone
            })
            .FirstOrDefaultAsync();

        if (organizationDetails == null)
        {
            return NotFound(new { message = "Organization not found for the provided token." });
        }

        return Ok(organizationDetails);
    }

    // External endpoint to get order details by external ID without requiring authentication (for email links)
    [HttpGet("{externalId:guid}")]
    public async Task<IActionResult> GetExternalOrderById(Guid externalId)
    {
        try
        {
            var order = await _orderService.GetExternalOrderByIdAsync(externalId);
            if (order == null)
                return NotFound(new { error = "Order not found" });
            
            return Ok(order);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting order");
            return StatusCode(500, new { error = "An error occurred while retrieving the order" });
        }
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

    [HttpPost("send-order-email")]
    public async Task<IActionResult> SendOrderEmail(
        [FromQuery(Name = "org")] string organizationToken,
        [FromBody] SendOrderEmailDto request)
    {
        var organization = await TryResolveOrganizationAsync(organizationToken);
        if (organization.error != null)
        {
            return organization.error;
        }

        if (string.IsNullOrWhiteSpace(request.CustomerEmail) || string.IsNullOrWhiteSpace(request.CustomerName))
        {
            return BadRequest(new { message = "Customer name and email are required." });
        }

        var orgDetails = await _context.Organizations
            .AsNoTracking()
            .Where(o => o.OrganizationId == organization.organizationId)
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

        if (orgDetails == null || string.IsNullOrWhiteSpace(orgDetails.OrganizationName))
        {
            return NotFound(new { message = "Organization not found for order email." });
        }

        var organizationName = orgDetails.OrganizationName;

        var slotStartAt = request.SlotStartAt;
        var slotEndAt = request.SlotEndAt;
        if (Guid.TryParse(request.OrderExternalId, out var orderExternalId))
        {
            var slotFromOrder = await _context.Orders
                .AsNoTracking()
                .Where(o => o.OrganizationId == organization.organizationId && o.ExternalId == orderExternalId && o.PickupSlot != null)
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
        var line1 = orgDetails.AddressLine1?.Trim();
        var line2 = orgDetails.AddressLine2?.Trim();

        await _emailService.SendOrderEmailAsync(
            request.CustomerEmail,
            organizationName,
            orgDetails.ContactEmail,
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
            pickupCity: orgDetails.City,
            pickupState: orgDetails.State,
            contactPhone: orgDetails.ContactPhone,
            contactEmail: orgDetails.ContactEmail);

        return Ok(new { message = "Order confirmation email sent." });
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
