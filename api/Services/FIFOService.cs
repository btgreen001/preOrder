using OrderMgmt.Models;
using OrderMgmt.DTOs;
using OrderMgmt.Data;
using Microsoft.EntityFrameworkCore;

namespace OrderMgmt.Services;

/// <summary>
/// Service for FIFO (First-In-First-Out) inventory rotation.
/// Ensures oldest inventory is used first, minimizing expiration waste.
/// </summary>
public interface IFIFOService
{
    /// <summary>
    /// Get batches in FIFO order (oldest expiration first) for a product.
    /// </summary>
    Task<List<FIFOBatchDto>> GetFIFOBatchesForProductAsync(Guid productExternalId, int quantityNeeded, Guid organizationId);
    
    /// <summary>
    /// Apply FIFO rotation - select batches in order for production.
    /// </summary>
    Task<List<FIFOBatchSelectionDto>> RotateBatchesForProductionAsync(Guid productExternalId, int quantityNeeded, Guid organizationId);
    
    /// <summary>
    /// Get expiration countdown for batch.
    /// </summary>
    Task<BatchExpirationInfoDto> GetExpirationInfoAsync(Guid batchExternalId, Guid organizationId);
}

public class FIFOService : IFIFOService
{
    private readonly OrderMgmtDbContext _context;
    private readonly ILogger<FIFOService> _logger;

    public FIFOService(OrderMgmtDbContext context, ILogger<FIFOService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get batches in FIFO order (oldest expiration first) for a product.
    /// Returns batches that can fulfill the needed quantity, ordered by expiration date.
    /// </summary>
    public async Task<List<FIFOBatchDto>> GetFIFOBatchesForProductAsync(Guid productExternalId, int quantityNeeded, Guid organizationId)
    {
        try
        {
            // Get the product
            var product = await _context.SellableProducts
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.ExternalId == productExternalId && p.OrganizationId == organizationId);

            if (product == null)
                throw new InvalidOperationException("Product not found");

            // Get active batches in FIFO order (oldest expiration first)
            var batchList = await _context.FinishedGoodsBatches
                .AsNoTracking()
                .Where(b => b.ProductId == product.Id 
                    && b.Status == "Active" 
                    && b.OrganizationId == organizationId
                    && b.ExpirationDate.HasValue
                    && b.ExpirationDate > DateTime.UtcNow) // Not yet expired
                .OrderBy(b => b.ExpirationDate)
                .ToListAsync();

            var batches = batchList.Select(b => 
            {
                var daysUntil = (int)(b.ExpirationDate!.Value - DateTime.UtcNow).TotalDays;
                return new FIFOBatchDto(
                    ExternalId: b.ExternalId,
                    BatchNumber: b.BatchNumber ?? "UNKNOWN",
                    QuantityAvailable: b.QuantityProduced - b.QuantitySold - b.QuantityWasted,
                    ProductionDate: b.ProductionDate,
                    ExpirationDate: b.ExpirationDate.Value,
                    CostPerUnit: b.CostPerUnit,
                    DaysUntilExpiration: daysUntil,
                    ExpirationStatus: GetExpirationStatus(daysUntil)
                );
            }).ToList();

            _logger.LogInformation($"Retrieved {batches.Count} FIFO batches for product {productExternalId}");
            return batches;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting FIFO batches: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Apply FIFO rotation - select batches in order to fulfill quantity.
    /// </summary>
    public async Task<List<FIFOBatchSelectionDto>> RotateBatchesForProductionAsync(Guid productExternalId, int quantityNeeded, Guid organizationId)
    {
        try
        {
            if (quantityNeeded <= 0)
                throw new InvalidOperationException("Quantity needed must be greater than 0");

            var fifoList = await GetFIFOBatchesForProductAsync(productExternalId, quantityNeeded, organizationId);
            var selections = new List<FIFOBatchSelectionDto>();
            int remainingQuantity = quantityNeeded;

            foreach (var batch in fifoList)
            {
                if (remainingQuantity <= 0)
                    break;

                int quantityFromBatch = Math.Min(remainingQuantity, batch.QuantityAvailable);
                
                selections.Add(new FIFOBatchSelectionDto(
                    BatchExternalId: batch.ExternalId,
                    BatchNumber: batch.BatchNumber,
                    QuantitySelected: quantityFromBatch,
                    ExpirationDate: batch.ExpirationDate,
                    DaysUntilExpiration: batch.DaysUntilExpiration,
                    CostPerUnit: batch.CostPerUnit,
                    TotalCost: batch.CostPerUnit * quantityFromBatch
                ));

                remainingQuantity -= quantityFromBatch;
            }

            if (remainingQuantity > 0)
            {
                _logger.LogWarning($"Cannot fulfill full quantity. Needed: {quantityNeeded}, Fulfilled: {quantityNeeded - remainingQuantity}");
            }

            _logger.LogInformation($"FIFO rotation: Selected {selections.Count} batches for {quantityNeeded} units");
            return selections;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error rotating batches: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Get expiration countdown info for a batch.
    /// </summary>
    public async Task<BatchExpirationInfoDto> GetExpirationInfoAsync(Guid batchExternalId, Guid organizationId)
    {
        try
        {
            var batch = await _context.FinishedGoodsBatches
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.ExternalId == batchExternalId && b.OrganizationId == organizationId);

            if (batch == null)
                throw new InvalidOperationException("Batch not found");

            if (!batch.ExpirationDate.HasValue)
                throw new InvalidOperationException("Batch has no expiration date");

            var daysUntil = (int)(batch.ExpirationDate.Value - DateTime.UtcNow).TotalDays;
            var isExpired = batch.ExpirationDate <= DateTime.UtcNow;

            return new BatchExpirationInfoDto(
                BatchExternalId: batchExternalId,
                BatchNumber: batch.BatchNumber ?? "UNKNOWN",
                ExpirationDate: batch.ExpirationDate.Value,
                DaysUntilExpiration: daysUntil,
                IsExpired: isExpired,
                ExpirationStatus: GetExpirationStatus(daysUntil),
                PercentageTimeRemaining: CalculatePercentageTime(batch.ProductionDate, batch.ExpirationDate.Value)
            );
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting expiration info: {ex.Message}");
            throw;
        }
    }

    private string GetExpirationStatus(int daysUntilExpiration)
    {
        if (daysUntilExpiration <= 0)
            return "EXPIRED";
        else if (daysUntilExpiration <= 3)
            return "CRITICAL"; // Red
        else if (daysUntilExpiration <= 7)
            return "WARNING"; // Yellow
        else
            return "GOOD"; // Green
    }

    private decimal CalculatePercentageTime(DateTime productionDate, DateTime expirationDate)
    {
        var totalLife = (expirationDate - productionDate).TotalDays;
        var timeRemaining = (expirationDate - DateTime.UtcNow).TotalDays;
        
        if (totalLife <= 0)
            return 0;

        return (decimal)(timeRemaining / totalLife) * 100;
    }
}
