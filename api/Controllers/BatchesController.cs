using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderMgmt.Services;
using OrderMgmt.DTOs;

namespace OrderMgmt.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BatchesController : ControllerBase
{
    private readonly IBatchService _batchService;
    private readonly IFIFOService _fifoService;
    private readonly IOrganizationContextService _orgContext;
    private readonly ILogger<BatchesController> _logger;

    public BatchesController(
        IBatchService batchService, 
        IFIFOService fifoService, 
        IOrganizationContextService orgContext,
        ILogger<BatchesController> logger)
    {
        _batchService = batchService;
        _fifoService = fifoService;
        _orgContext = orgContext;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<BatchDetailDto>>> GetBatches(string? status = null, int? pageNumber = null, int? pageSize = null)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var batches = await _batchService.GetBatchesAsync(orgId, status, pageNumber, pageSize);
            return Ok(batches);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting batches");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpGet("{externalId:guid}")]
    public async Task<ActionResult<BatchDetailDto>> GetBatch(Guid externalId)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var batch = await _batchService.GetBatchByExternalIdAsync(externalId, orgId);
            
            if (batch == null)
                return NotFound(new { message = "Batch not found" });
            
            return Ok(batch);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting batch {ExternalId}", externalId);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpGet("expiring")]
    public async Task<ActionResult<List<BatchDetailDto>>> GetExpiringBatches(int? daysUntilExpiration = null)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var batches = await _batchService.GetExpiringBatchesAsync(orgId, daysUntilExpiration ?? 30);
            return Ok(batches);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting expiring batches");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost]
    public async Task<ActionResult<BatchDetailDto>> CreateBatch([FromBody] CreateBatchRequest request)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var userId = _orgContext.GetCurrentUserId().ToString();
            
            var batch = await _batchService.CreateBatchAsync(request, orgId, userId);
            return CreatedAtAction(nameof(GetBatch), new { externalId = batch.ExternalId }, batch);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating batch");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPut("{externalId:guid}/complete")]
    public async Task<ActionResult<BatchDetailDto>> CompleteBatch(Guid externalId)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var userId = _orgContext.GetCurrentUserId().ToString();
            
            var batch = await _batchService.CompleteBatchAsync(externalId, orgId, userId);
            
            if (batch == null)
                return NotFound(new { message = "Batch not found" });
            
            return Ok(batch);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error completing batch {ExternalId}", externalId);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPut("{externalId:guid}/cancel")]
    public async Task<ActionResult<BatchDetailDto>> CancelBatch(Guid externalId)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var userId = _orgContext.GetCurrentUserId().ToString();
            
            var batch = await _batchService.CancelBatchAsync(externalId, orgId, userId);
            
            if (batch == null)
                return NotFound(new { message = "Batch not found" });
            
            return Ok(batch);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling batch {ExternalId}", externalId);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get batches in FIFO order for a product.
    /// </summary>
    [HttpGet("fifo")]
    public async Task<ActionResult<List<FIFOBatchDto>>> GetFIFOBatches(Guid productId, int quantityNeeded)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var fifoList = await _fifoService.GetFIFOBatchesForProductAsync(productId, quantityNeeded, orgId);
            return Ok(fifoList);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting FIFO batches");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Apply FIFO rotation to select batches for production.
    /// </summary>
    [HttpPost("fifo-rotate")]
    public async Task<ActionResult<List<FIFOBatchSelectionDto>>> RotateBatchesFIFO([FromBody] FIFORotationRequest request)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var selections = await _fifoService.RotateBatchesForProductionAsync(request.ProductId, request.QuantityNeeded, orgId);
            return Ok(selections);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rotating batches");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get expiration information for a batch.
    /// </summary>
    [HttpGet("{externalId:guid}/expiration-info")]
    public async Task<ActionResult<BatchExpirationInfoDto>> GetExpirationInfo(Guid externalId)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var info = await _fifoService.GetExpirationInfoAsync(externalId, orgId);
            return Ok(info);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting expiration info");
            return StatusCode(500, new { message = ex.Message });
        }
    }
}
