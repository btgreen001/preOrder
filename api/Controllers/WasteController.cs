using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderMgmt.Services;
using OrderMgmt.Filters;

namespace OrderMgmt.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[ValidateTenantAccess]
public class WasteController : ControllerBase
{
    private readonly IWasteService _wasteService;
    private readonly ILogger<WasteController> _logger;
    private readonly IOrganizationContextService _orgContext;
    public WasteController(IWasteService wasteService, ILogger<WasteController> logger, IOrganizationContextService orgContext)
    {
        _wasteService = wasteService;
        _logger = logger;
        _orgContext = orgContext;
    }


    [HttpGet]
    public async Task<ActionResult<List<WasteEventDto>>> GetWasteEvents(string? reason = null, int? pageNumber = null, int? pageSize = null)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var wasteEvents = await _wasteService.GetWasteEventsAsync(orgId, reason, pageNumber, pageSize);
            return Ok(wasteEvents);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting waste events");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpGet("{externalId:guid}")]
    public async Task<ActionResult<WasteEventDto>> GetWasteEvent(Guid externalId)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var wasteEvent = await _wasteService.GetWasteEventByExternalIdAsync(externalId, orgId);
            
            if (wasteEvent == null)
                return NotFound(new { message = "Waste event not found" });
            
            return Ok(wasteEvent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting waste event {ExternalId}", externalId);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost]
    public async Task<ActionResult<WasteEventDto>> LogWasteEvent([FromBody] LogWasteEventRequest request)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var userId = _orgContext.GetCurrentUserId().ToString();
            
            var wasteEvent = await _wasteService.LogWasteEventAsync(request, orgId, userId);
            return CreatedAtAction(nameof(GetWasteEvent), new { externalId = wasteEvent.ExternalId }, wasteEvent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging waste event");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpGet("analytics")]
    public async Task<ActionResult<WasteAnalytics>> GetWasteAnalytics(DateTime? startDate = null, DateTime? endDate = null)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var analytics = await _wasteService.GetWasteAnalyticsAsync(orgId, startDate, endDate);
            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting waste analytics");
            return StatusCode(500, new { message = ex.Message });
        }
    }
}
