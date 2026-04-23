using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using OrderMgmt.Services;
using OrderMgmt.DTOs;
using OrderMgmt.Filters;
using OrderMgmt.Models;

namespace OrderMgmt.Controllers;

/// <summary>
/// Inventory Depletion Management API
/// Handles automatic inventory reduction when production occurs
/// Phase 3.3.2 Implementation
/// </summary>
[ApiController]
[Route("api/inventory-depletion")]
[Authorize(Roles = UserRoles.SystemAdmin + "," + UserRoles.CompanyAdmin + ",admin," + UserRoles.User)]
[ValidateTenantAccess]
public class InventoryDepletionController : ControllerBase
{
    private readonly IInventoryDepletionService _depletionService;
    private readonly ILogger<InventoryDepletionController> _logger;
    private readonly IOrganizationContextService _orgContext;


    public InventoryDepletionController(
        IInventoryDepletionService depletionService,
        ILogger<InventoryDepletionController> logger,
        IOrganizationContextService orgContext)
    {
        _depletionService = depletionService;
        _logger = logger;
        _orgContext = orgContext;
    }

    /// <summary>
    /// Deplete inventory when production batch completes
    /// </summary>
    [HttpPost("deplete")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<DepletionHistoryDto>> DepletInventory(
        [FromBody] DepleteBatchRequest request)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var depletedBy = User.FindFirst("sub")?.Value ?? "system";

            var history = await _depletionService.DepletInventoryAsync(request.BatchExternalId, orgId, depletedBy);
            return Ok(history);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning($"Invalid depletion request: {ex.Message}");
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error depleting inventory: {ex.Message}");
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Get depletion history for a product
    /// </summary>
    [HttpGet("history")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<List<DepletionHistoryDto>>> GetDepletionHistory(
        [FromQuery] Guid productExternalId,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate
 
        )
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();

            var history = await _depletionService.GetDepletionHistoryAsync(productExternalId, startDate, endDate, orgId);
            return Ok(history);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error retrieving depletion history: {ex.Message}");
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Get depletion summary with cost analysis
    /// </summary>
    [HttpGet("summary")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<DepletionSummaryDto>> GetDepletionSummary(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();

            var summary = await _depletionService.GetDepletionSummaryAsync(orgId, startDate, endDate);
            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error retrieving depletion summary: {ex.Message}");
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Get inventory alerts (low stock, expiring soon, expired)
    /// </summary>
    [HttpGet("alerts")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<InventoryAlertDto[]>> GetInventoryAlerts()
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();

            var alerts = await _depletionService.GetInventoryAlertsAsync(orgId);
            return Ok(alerts);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error retrieving inventory alerts: {ex.Message}");
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = ex.Message });
        }
    }
}

/// <summary>
/// Request to deplete inventory for a batch
/// </summary>
public record DepleteBatchRequest(
    Guid BatchExternalId
);
