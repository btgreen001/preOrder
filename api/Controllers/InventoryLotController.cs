using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderMgmt.DTOs;
using OrderMgmt.Services;
using OrderMgmt.Filters;
using OrderMgmt.Models;
using System.Security.Claims;

namespace OrderMgmt.Controllers;

/// <summary>
/// InventoryLot management API endpoints
/// Tracks bidirectional lot/batch movements with expected vs actual quantities
/// </summary>
[ApiController]
[Route("api/inventory-lots")]
[Authorize(Roles = UserRoles.SystemAdmin + "," + UserRoles.CompanyAdmin + ",admin," + UserRoles.User)]
[ValidateTenantAccess]
public class InventoryLotController : ControllerBase
{
    private readonly IInventoryLotService _service;
    private readonly ILogger<InventoryLotController> _logger;
    private readonly IOrganizationContextService _orgContext;

    public InventoryLotController(IInventoryLotService service, ILogger<InventoryLotController> logger, IOrganizationContextService orgContext)
    {
        _service = service;
        _logger = logger;
        _orgContext = orgContext;
    }

    /// <summary>Get inventory lot by external ID</summary>
    [HttpGet("{externalId:guid}")]
    [ProducesResponseType(typeof(InventoryLotDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<InventoryLotDto>> GetLot(Guid externalId)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var lot = await _service.GetLotByExternalIdAsync(externalId, organizationId);
        
        if (lot == null)
            return NotFound(new { message = $"Lot {externalId} not found" });

        return Ok(lot);
    }

    /// <summary>Get all inventory lots for an inventory item</summary>
    [HttpGet("by-item/{inventoryItemId:long}")]
    [ProducesResponseType(typeof(List<InventoryLotListItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<List<InventoryLotListItemDto>>> GetLotsByItem(long inventoryItemId)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var lots = await _service.GetLotsByInventoryItemAsync(inventoryItemId, organizationId);
        return Ok(lots);
    }

    /// <summary>Get all inventory lots with pagination</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<InventoryLotListItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<List<InventoryLotListItemDto>>> GetAllLots([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20)
    {
        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 20;

        var organizationId = _orgContext.GetCurrentOrganizationId();
        var lots = await _service.GetAllLotsAsync(organizationId, pageNumber, pageSize);
        return Ok(lots);
    }

    /// <summary>Create a new inventory lot</summary>
    [HttpPost]
    [ProducesResponseType(typeof(InventoryLotDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<InventoryLotDto>> CreateLot([FromBody] CreateInventoryLotDto dto)
    {
        if (dto == null)
            return BadRequest(new { message = "Invalid request body" });

        var organizationId = _orgContext.GetCurrentOrganizationId();
        var userId = _orgContext.GetCurrentUserId();

        try
        {
            var lot = await _service.CreateLotAsync(dto, organizationId, userId);
            return CreatedAtAction(nameof(GetLot), new { externalId = lot.ExternalId }, lot);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Invalid argument when creating lot: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Update an inventory lot (actual quantities, discrepancies)</summary>
    [HttpPut("{externalId:guid}")]
    [ProducesResponseType(typeof(InventoryLotDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<InventoryLotDto>> UpdateLot(Guid externalId, [FromBody] UpdateInventoryLotDto dto)
    {
        if (dto == null)
            return BadRequest(new { message = "Invalid request body" });

        var organizationId = _orgContext.GetCurrentOrganizationId();
        var userId = _orgContext.GetCurrentUserId();

        try
        {
            var lot = await _service.UpdateLotAsync(externalId, dto, organizationId, userId);
            return Ok(lot);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Invalid argument when updating lot: {Message}", ex.Message);
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>Delete an inventory lot</summary>
    [HttpDelete("{externalId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DeleteLot(Guid externalId)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();

        try
        {
            await _service.DeleteLotAsync(externalId, organizationId);
            return NoContent();
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Lot not found: {Message}", ex.Message);
            return NotFound(new { message = ex.Message });
        }
    }
}