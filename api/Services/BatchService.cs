using PreOrderApp.Models;
using PreOrderApp.Data;
using Microsoft.EntityFrameworkCore;

namespace PreOrderApp.Services;

public interface IBatchService
{
    Task<BatchDetailDto?> GetBatchByExternalIdAsync(Guid externalId, Guid organizationId);
    Task<List<BatchDetailDto>> GetBatchesAsync(Guid organizationId, string? status = null, int? pageNumber = null, int? pageSize = null);
    Task<List<BatchDetailDto>> GetExpiringBatchesAsync(Guid organizationId, int daysUntilExpiration = 30);
    Task<BatchDetailDto> CreateBatchAsync(CreateBatchRequest request, Guid organizationId, string createdBy);
    Task<BatchDetailDto> CompleteBatchAsync(Guid externalId, Guid organizationId, string updatedBy);
    Task<BatchDetailDto> CancelBatchAsync(Guid externalId, Guid organizationId, string updatedBy);
}

public class BatchService : IBatchService
{
    private readonly AppDbContext _context;
    private readonly ILogger<BatchService> _logger;

    public BatchService(AppDbContext context, ILogger<BatchService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<BatchDetailDto?> GetBatchByExternalIdAsync(Guid externalId, Guid organizationId)
    {
        try
        {
            var batch = await _context.FinishedGoodsBatches
                .AsNoTracking()
                .Where(b => b.ExternalId == externalId && b.OrganizationId == organizationId)
                .FirstOrDefaultAsync();

            if (batch == null)
                return null;

            return MapToDto(batch);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting batch {ExternalId}", externalId);
            throw;
        }
    }

    public async Task<List<BatchDetailDto>> GetBatchesAsync(Guid organizationId, string? status = null, int? pageNumber = null, int? pageSize = null)
    {
        try
        {
            var query = _context.FinishedGoodsBatches
                .AsNoTracking()
                .Where(b => b.OrganizationId == organizationId);

            if (!string.IsNullOrEmpty(status))
                query = query.Where(b => b.Status == status);

            if (pageNumber.HasValue && pageSize.HasValue)
            {
                var skip = (pageNumber.Value - 1) * pageSize.Value;
                query = query.Skip(skip).Take(pageSize.Value);
            }

            var batches = await query
                .OrderByDescending(b => b.ProductionDate)
                .ToListAsync();

            return batches.Select(MapToDto).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting batches for organization {OrgId}", organizationId);
            throw;
        }
    }

    public async Task<List<BatchDetailDto>> GetExpiringBatchesAsync(Guid organizationId, int daysUntilExpiration = 30)
    {
        try
        {
            var expirationThreshold = DateTime.UtcNow.AddDays(daysUntilExpiration);

            var batches = await _context.FinishedGoodsBatches
                .AsNoTracking()
                .Where(b => b.OrganizationId == organizationId
                    && b.Status == "Active"
                    && b.ExpirationDate.HasValue
                    && b.ExpirationDate <= expirationThreshold)
                .OrderBy(b => b.ExpirationDate)
                .ToListAsync();

            return batches.Select(MapToDto).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting expiring batches for organization {OrgId}", organizationId);
            throw;
        }
    }

    public async Task<BatchDetailDto> CreateBatchAsync(CreateBatchRequest request, Guid organizationId, string createdBy)
    {
        try
        {
            // Validate recipe exists
            var recipe = await _context.RecipeDetails
                .FirstOrDefaultAsync(r => r.Id == request.RecipeId && r.OrganizationId == organizationId);

            if (recipe == null)
                throw new InvalidOperationException($"Recipe with ID {request.RecipeId} not found");

            // Validate product exists
            var product = await _context.SellableProducts
                .FirstOrDefaultAsync(p => p.Id == request.ProductId && p.OrganizationId == organizationId);

            if (product == null)
                throw new InvalidOperationException($"Product with ID {request.ProductId} not found");

            var batch = new FinishedGoodsBatch
            {
                ExternalId = Guid.NewGuid(),
                OrganizationId = organizationId,
                RecipeId = request.RecipeId,
                ProductId = request.ProductId,
                QuantityProduced = request.QuantityProduced,
                Unit = request.Unit ?? "pieces",
                ProductionDate = request.ProductionDate ?? DateTime.UtcNow,
                ExpirationDate = request.ExpirationDate,
                CostPerUnit = recipe.CostPerUnit ?? 0m,
                BatchNumber = request.BatchNumber ?? GenerateBatchNumber(product.Name),
                Status = "Active",
                QuantitySold = 0,
                QuantityWasted = 0,
                CreatedBy = createdBy,
                CreatedAt = DateTime.UtcNow,
                UpdatedBy = createdBy,
                UpdatedAt = DateTime.UtcNow,
                VersionNbr = 1
            };

            _context.FinishedGoodsBatches.Add(batch);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Batch {ExternalId} created for product {ProductId}", batch.ExternalId, batch.ProductId);
            return MapToDto(batch);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating batch");
            throw;
        }
    }

    public async Task<BatchDetailDto> CompleteBatchAsync(Guid externalId, Guid organizationId, string updatedBy)
    {
        try
        {
            var batch = await _context.FinishedGoodsBatches
                .Include(b => b.Product)
                .FirstOrDefaultAsync(b => b.ExternalId == externalId && b.OrganizationId == organizationId);

            if (batch == null)
                throw new InvalidOperationException($"Batch {externalId} not found");

            if (string.Equals(batch.Status, "Completed", StringComparison.OrdinalIgnoreCase))
                return MapToDto(batch);

            batch.Status = "Completed";
            batch.UpdatedBy = updatedBy;
            batch.UpdatedAt = DateTime.UtcNow;
            batch.VersionNbr++;

            if (batch.Product?.IsRecipeComponent == true)
            {
                batch.Product.QuantityOnHand += batch.QuantityProduced;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Batch {ExternalId} marked as completed", externalId);
            return MapToDto(batch);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error completing batch {ExternalId}", externalId);
            throw;
        }
    }

    public async Task<BatchDetailDto> CancelBatchAsync(Guid externalId, Guid organizationId, string updatedBy)
    {
        try
        {
            var batch = await _context.FinishedGoodsBatches
                .FirstOrDefaultAsync(b => b.ExternalId == externalId && b.OrganizationId == organizationId);

            if (batch == null)
                throw new InvalidOperationException($"Batch {externalId} not found");

            batch.Status = "Cancelled";
            batch.UpdatedBy = updatedBy;
            batch.UpdatedAt = DateTime.UtcNow;
            batch.VersionNbr++;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Batch {ExternalId} cancelled", externalId);
            return MapToDto(batch);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling batch {ExternalId}", externalId);
            throw;
        }
    }

    private static string GenerateBatchNumber(string productName)
    {
        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd");
        var random = new Random().Next(1, 1000);
        var productPrefix = productName.Length >= 3 ? productName.Substring(0, 3).ToUpper() : productName.ToUpper();
        return $"{productPrefix}-{timestamp}-{random:D3}";
    }

    private static BatchDetailDto MapToDto(FinishedGoodsBatch batch)
    {
        return new BatchDetailDto
        {
            ExternalId = batch.ExternalId,
            RecipeId = batch.RecipeId,
            ProductId = batch.ProductId,
            QuantityProduced = batch.QuantityProduced,
            Unit = batch.Unit,
            ProductionDate = batch.ProductionDate,
            ExpirationDate = batch.ExpirationDate,
            CostPerUnit = batch.CostPerUnit,
            BatchNumber = batch.BatchNumber,
            Status = batch.Status,
            QuantitySold = batch.QuantitySold,
            QuantityWasted = batch.QuantityWasted,
            CreatedAt = batch.CreatedAt,
            CreatedBy = batch.CreatedBy,
            UpdatedAt = batch.UpdatedAt,
            UpdatedBy = batch.UpdatedBy
        };
    }
}

// DTOs
public class BatchDetailDto
{
    public Guid ExternalId { get; set; }
    public long RecipeId { get; set; }
    public long ProductId { get; set; }
    public int QuantityProduced { get; set; }
    public string Unit { get; set; } = "pieces";
    public DateTime ProductionDate { get; set; }
    public DateTime? ExpirationDate { get; set; }
    public decimal CostPerUnit { get; set; }
    public string? BatchNumber { get; set; }
    public string Status { get; set; } = "Active";
    public int QuantitySold { get; set; }
    public int QuantityWasted { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
    public string UpdatedBy { get; set; } = string.Empty;
}

public class CreateBatchRequest
{
    public long RecipeId { get; set; }
    public long ProductId { get; set; }
    public int QuantityProduced { get; set; } = 1;
    public string? Unit { get; set; }
    public DateTime? ProductionDate { get; set; }
    public DateTime? ExpirationDate { get; set; }
    public string? BatchNumber { get; set; }
}
