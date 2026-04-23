using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderMgmt.DTOs;
using OrderMgmt.Services;
using System.Security.Claims;
using OrderMgmt.Filters;
namespace OrderMgmt.Controllers;

/// <summary>
/// Product movement tracking API endpoints
/// Unified tracking for all product movements: RECEIVED, SOLD, WASTED, ADJUSTED
/// Replaces legacy waste_event table with comprehensive movement history
/// </summary>
[ApiController]
[Route("api/product-movements")]
[Authorize]
[ValidateTenantAccess]

public class ProductMovementController : ControllerBase
{
    private readonly IProductMovementService _service;
    private readonly ILogger<ProductMovementController> _logger;
    private readonly IOrganizationContextService _orgContext;

    public ProductMovementController(IProductMovementService service, ILogger<ProductMovementController> logger, IOrganizationContextService orgContext)
    {
        _service = service;
        _logger = logger;
        _orgContext = orgContext;
    }

    /// <summary>Get product movement by external ID</summary>
    [HttpGet("{externalId:guid}")]
    [ProducesResponseType(typeof(ProductMovementDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ProductMovementDto>> GetMovement(Guid externalId)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var movement = await _service.GetMovementByExternalIdAsync(externalId, organizationId);
        
        if (movement == null)
            return NotFound(new { message = $"Movement {externalId} not found" });

        return Ok(movement);
    }

    /// <summary>Get all movements for a product (optionally filtered by type)</summary>
    [HttpGet("by-product/{productId:long}")]
    [ProducesResponseType(typeof(List<ProductMovementListItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<List<ProductMovementListItemDto>>> GetMovementsByProduct(
        long productId, 
        [FromQuery] string? movementType = null)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var movements = await _service.GetMovementsByProductAsync(productId, organizationId, movementType);
        return Ok(movements);
    }

    /// <summary>Get movements by type (RECEIVED, SOLD, WASTED, ADJUSTED) with pagination</summary>
    [HttpGet("by-type/{movementType}")]
    [ProducesResponseType(typeof(List<ProductMovementListItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<List<ProductMovementListItemDto>>> GetMovementsByType(
        string movementType,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20)
    {
        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 20;

        var organizationId = _orgContext.GetCurrentOrganizationId();
        var movements = await _service.GetMovementsByTypeAsync(movementType, organizationId, pageNumber, pageSize);
        return Ok(movements);
    }

    /// <summary>Get all product movements with pagination</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<ProductMovementListItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<List<ProductMovementListItemDto>>> GetAllMovements(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20)
    {
        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 20;

        var organizationId = _orgContext.GetCurrentOrganizationId();
        var movements = await _service.GetAllMovementsAsync(organizationId, pageNumber, pageSize);
        return Ok(movements);
    }

    /// <summary>Get movement summary (count, total quantity) by type</summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(ProductMovementSummaryDto[]), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ProductMovementSummaryDto[]>> GetSummary(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var organizationId = _orgContext.GetCurrentOrganizationId();
        var summary = await _service.GetMovementSummaryAsync(organizationId, startDate, endDate);
        return Ok(summary);
    }

    /// <summary>Record a new product movement (generic)</summary>
    [HttpPost]
    [ProducesResponseType(typeof(ProductMovementDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ProductMovementDto>> RecordMovement([FromBody] CreateProductMovementDto dto)
    {
        if (dto == null)
            return BadRequest(new { message = "Invalid request body" });

        var organizationId = _orgContext.GetCurrentOrganizationId();
        var userId = _orgContext.GetCurrentUserId();

        try
        {
            var movement = await _service.RecordMovementAsync(dto, organizationId, userId);
            return CreatedAtAction(nameof(GetMovement), new { externalId = movement.ExternalId }, movement);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Invalid argument when recording movement: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Record a product received from supplier</summary>
    [HttpPost("{productId:long}/received")]
    [ProducesResponseType(typeof(ProductMovementDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ProductMovementDto>> RecordReceived(
        long productId,
        [FromBody] ReceivedMovementDto dto)
    {
        if (dto == null)
            return BadRequest(new { message = "Invalid request body" });

        var organizationId = _orgContext.GetCurrentOrganizationId();
        var userId = _orgContext.GetCurrentUserId();

        try
        {
            var movement = await _service.RecordReceivedAsync(
                productId, dto.Quantity, dto.UnitOfMeasure, dto.Reason, dto.ReferenceId, 
                dto.BatchId, dto.LotId, organizationId, userId);
            return CreatedAtAction(nameof(GetMovement), new { externalId = movement.ExternalId }, movement);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Invalid argument when recording received: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Record a product sold to customer</summary>
    [HttpPost("{productId:long}/sold")]
    [ProducesResponseType(typeof(ProductMovementDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ProductMovementDto>> RecordSale(
        long productId,
        [FromBody] SaleMovementDto dto)
    {
        if (dto == null)
            return BadRequest(new { message = "Invalid request body" });

        var organizationId = _orgContext.GetCurrentOrganizationId();
        var userId = _orgContext.GetCurrentUserId();

        try
        {
            var movement = await _service.RecordSaleAsync(productId, dto.Quantity, dto.UnitOfMeasure, dto.ReferenceId, organizationId, userId);
            return CreatedAtAction(nameof(GetMovement), new { externalId = movement.ExternalId }, movement);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Invalid argument when recording sale: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Record product waste/spoilage</summary>
    [HttpPost("{productId:long}/wasted")]
    [ProducesResponseType(typeof(ProductMovementDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ProductMovementDto>> RecordWaste(
        long productId,
        [FromBody] WasteMovementDto dto)
    {
        if (dto == null)
            return BadRequest(new { message = "Invalid request body" });

        var organizationId = _orgContext.GetCurrentOrganizationId();
        var userId = _orgContext.GetCurrentUserId();

        try
        {
            var movement = await _service.RecordWasteAsync(productId, dto.Quantity, dto.UnitOfMeasure, dto.Reason, dto.ReferenceId, organizationId, userId);
            return CreatedAtAction(nameof(GetMovement), new { externalId = movement.ExternalId }, movement);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Invalid argument when recording waste: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Record inventory adjustment</summary>
    [HttpPost("{productId:long}/adjusted")]
    [ProducesResponseType(typeof(ProductMovementDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ProductMovementDto>> RecordAdjustment(
        long productId,
        [FromBody] AdjustmentMovementDto dto)
    {
        if (dto == null)
            return BadRequest(new { message = "Invalid request body" });

        var organizationId = _orgContext.GetCurrentOrganizationId();
        var userId = _orgContext.GetCurrentUserId();

        try
        {
            var movement = await _service.RecordAdjustmentAsync(productId, dto.Quantity, dto.UnitOfMeasure, dto.Reason, organizationId, userId);
            return CreatedAtAction(nameof(GetMovement), new { externalId = movement.ExternalId }, movement);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Invalid argument when recording adjustment: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
    }
}

// Helper DTOs for specific movement types
public record ReceivedMovementDto(decimal Quantity, string UnitOfMeasure, string? Reason, string? ReferenceId, long? BatchId, long? LotId);
public record SaleMovementDto(decimal Quantity, string UnitOfMeasure, string? ReferenceId);
public record WasteMovementDto(decimal Quantity, string UnitOfMeasure, string Reason, string? ReferenceId);
public record AdjustmentMovementDto(decimal Quantity, string UnitOfMeasure, string Reason);
