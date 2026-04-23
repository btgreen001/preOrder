using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderMgmt.DTOs;
using OrderMgmt.Filters;
using OrderMgmt.Services;

namespace OrderMgmt.Controllers;

[ApiController]
[Route("api/unit-conversions")]
[Authorize]
[ValidateTenantAccess]
public class UnitConversionsController : ControllerBase
{
    private readonly IUnitConversionService _service;
    private readonly IOrganizationContextService _orgContext;
    private readonly ILogger<UnitConversionsController> _logger;

    public UnitConversionsController(
        IUnitConversionService service,
        IOrganizationContextService orgContext,
        ILogger<UnitConversionsController> logger)
    {
        _service = service;
        _orgContext = orgContext;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<UnitConversionDto>>> GetConversions(
        [FromQuery] bool includeGlobal = true,
        [FromQuery] string? category = null)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var results = await _service.GetConversionsAsync(organizationId, includeGlobal, category);
        return Ok(results);
    }

    [HttpPost("convert")]
    public async Task<ActionResult<ConvertUnitResponse>> Convert([FromBody] ConvertUnitRequest request)
    {
        try
        {
            var organizationId = _orgContext.GetCurrentOrganizationId();
            var result = await _service.ConvertAsync(organizationId, request);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpPost("scale")]
    public async Task<ActionResult<ScaleQuantityResponse>> Scale([FromBody] ScaleQuantityRequest request)
    {
        try
        {
            var result = await _service.ScaleAsync(request);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("fraction/parse")]
    public async Task<ActionResult<ParseFractionResponse>> ParseFraction([FromBody] ParseFractionRequest request)
    {
        try
        {
            var result = await _service.ParseFractionAsync(request);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("fraction/format")]
    public async Task<ActionResult<FormatFractionResponse>> FormatFraction([FromBody] FormatFractionRequest request)
    {
        try
        {
            var result = await _service.FormatFractionAsync(request);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("organization")]
    [RequireTenantAdmin]
    public async Task<ActionResult<UnitConversionDto>> UpsertOrganizationConversion([FromBody] UpsertUnitConversionRequest request)
    {
        try
        {
            var organizationId = _orgContext.GetCurrentOrganizationId();
            var userId = _orgContext.GetCurrentUserId();
            var result = await _service.UpsertOrganizationConversionAsync(organizationId, userId, request);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    [HttpPut("global")]
    [ValidateSysAdmin]
    public async Task<ActionResult<UnitConversionDto>> UpsertGlobalConversion([FromBody] UpsertUnitConversionRequest request)
    {
        try
        {
            var userId = _orgContext.GetCurrentUserId();
            var result = await _service.UpsertGlobalConversionAsync(userId, request);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{externalId:guid}")]
    [RequireTenantAdmin]
    public async Task<IActionResult> Deactivate(Guid externalId)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var userId = _orgContext.GetCurrentUserId();
        var role = User.FindFirst("role")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        var isSystemAdmin = string.Equals(role, "SystemAdmin", StringComparison.OrdinalIgnoreCase);

        try
        {
            var deactivated = await _service.DeactivateConversionAsync(externalId, organizationId, userId, isSystemAdmin);
            if (!deactivated)
            {
                _logger.LogInformation("Unit conversion {ExternalId} not found or not accessible for org {OrganizationId}", externalId, organizationId);
                return NotFound(new { error = "Unit conversion not found." });
            }

            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }
}
