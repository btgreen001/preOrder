using OrderMgmt.Models;
using OrderMgmt.DTOs;
using OrderMgmt.Data;
using Microsoft.EntityFrameworkCore;

namespace OrderMgmt.Services;

/// <summary>
/// Service for automatic inventory depletion when production occurs.
/// Handles FIFO batch selection and inventory reduction for cost tracking.
/// Phase 3.3.2 Implementation
/// </summary>
public interface IInventoryDepletionService
{
    Task<DepletionHistoryDto> DepletInventoryAsync(Guid batchId, Guid organizationId, string depletedBy);
    Task<List<DepletionHistoryDto>> GetDepletionHistoryAsync(Guid productId, DateTime? startDate, DateTime? endDate, Guid organizationId);
    Task<DepletionSummaryDto> GetDepletionSummaryAsync(Guid organizationId, DateTime? startDate, DateTime? endDate);
    Task<InventoryAlertDto[]> GetInventoryAlertsAsync(Guid organizationId);
}

public class InventoryDepletionService : IInventoryDepletionService
{
    private sealed record RecipeDepletionResult(decimal TotalCost, List<string> Details);

    private readonly OrderMgmtDbContext _context;
    private readonly ILogger<InventoryDepletionService> _logger;
    private readonly IRecipeService _recipeService;

    public InventoryDepletionService(
        OrderMgmtDbContext context,
        ILogger<InventoryDepletionService> logger,
        IRecipeService recipeService)
    {
        _context = context;
        _logger = logger;
        _recipeService = recipeService;
    }

    /// <summary>
    /// Deplete inventory when production batch completes
    /// Uses recipe ingredients and FIFO batch selection
    /// </summary>
    public async Task<DepletionHistoryDto> DepletInventoryAsync(Guid batchExternalId, Guid organizationId, string depletedBy)
    {
        try
        {
            // Get batch with recipe
            var batch = await _context.FinishedGoodsBatches
                .Include(b => b.Recipe)
                .FirstOrDefaultAsync(b => b.ExternalId == batchExternalId && b.OrganizationId == organizationId);

            if (batch == null)
                throw new InvalidOperationException($"Batch {batchExternalId} not found");

            var productionFactor = batch.Recipe != null && batch.Recipe.YieldServingCnt > 0
                ? (decimal)batch.QuantityProduced / batch.Recipe.YieldServingCnt
                : 1m;

            var depletionResult = await DepleteRecipeRequirementsAsync(batch.RecipeId, productionFactor, organizationId);

            await _context.SaveChangesAsync();

            var history = new DepletionHistoryDto(
                Guid.NewGuid().ToString(),
                batchExternalId.ToString(),
                batchExternalId.ToString(),
                batch.Id,
                DateTime.UtcNow,
                depletedBy,
                depletionResult.TotalCost,
                depletionResult.Details.Count > 0
                    ? string.Join("; ", depletionResult.Details)
                    : "No tracked inventory consumed"
            );

            _logger.LogInformation($"Depleted inventory for batch {batchExternalId}: Total cost ${depletionResult.TotalCost:F2}");
            return history;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error depleting inventory for batch {batchExternalId}: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Get depletion history for product
    /// Shows all ingredient usage over time
    /// </summary>
    public async Task<List<DepletionHistoryDto>> GetDepletionHistoryAsync(
        Guid productExternalId,
        DateTime? startDate,
        DateTime? endDate,
        Guid organizationId)
    {
        try
        {
            // Look up product by external ID to get its numeric ID
            var product = await _context.SellableProducts
                .FirstOrDefaultAsync(p => p.ExternalId == productExternalId && p.OrganizationId == organizationId);

            if (product == null)
                throw new InvalidOperationException($"Product {productExternalId} not found");

            var query = _context.FinishedGoodsBatches
                .Where(b => b.ProductId == product.Id && b.OrganizationId == organizationId);

            if (startDate.HasValue)
                query = query.Where(b => b.ProductionDate >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(b => b.ProductionDate <= endDate.Value);

            var batches = await query
                .OrderByDescending(b => b.ProductionDate)
                .ToListAsync();

            var history = batches.Select(b => new DepletionHistoryDto(
                b.ExternalId.ToString(),
                b.ExternalId.ToString(),
                b.ExternalId.ToString(),
                b.Id,
                b.ProductionDate,
                "system",
                b.CostPerUnit * b.QuantityProduced,
                $"Production batch completed"
            )).ToList();

            return history;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error retrieving depletion history for product {productExternalId}: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Get summary of depletion costs by ingredient and time period
    /// </summary>
    public async Task<DepletionSummaryDto> GetDepletionSummaryAsync(
        Guid organizationId,
        DateTime? startDate,
        DateTime? endDate)
    {
        try
        {
            var query = _context.FinishedGoodsBatches
                .Where(b => b.OrganizationId == organizationId);

            if (startDate.HasValue)
                query = query.Where(b => b.ProductionDate >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(b => b.ProductionDate <= endDate.Value);

            var batches = await query.ToListAsync();

            // Calculate total cost (CostPerUnit * QuantityProduced)
            var totalCost = batches.Sum(b => b.CostPerUnit * b.QuantityProduced);
            var batchCount = batches.Count;
            var averageCostPerBatch = batchCount > 0 ? totalCost / batchCount : 0m;

            var topProductIds = batches
                .GroupBy(b => b.ProductId)
                .Select(g => new { ProductId = g.Key, Cost = g.Sum(b => b.CostPerUnit * b.QuantityProduced), Count = g.Count() })
                .OrderByDescending(x => x.Cost)
                .Take(10)
                .Select(p => $"{p.ProductId}: ${p.Cost:F2} ({p.Count} batches)")
                .ToList();

            return new DepletionSummaryDto(
                totalCost,
                batchCount,
                averageCostPerBatch,
                topProductIds
            );
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error calculating depletion summary: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Get inventory alerts for low stock and expiring items
    /// </summary>
    public async Task<InventoryAlertDto[]> GetInventoryAlertsAsync(Guid organizationId)
    {
        try
        {
            var alerts = new List<InventoryAlertDto>();
            var now = DateTime.UtcNow;

            // Low stock alerts
            var lowStockItems = await _context.InventoryItems
                .Where(ii => ii.OrganizationId == organizationId && ii.QuantityOnHand <= ii.ReorderPoint)
                .Select(ii => new InventoryAlertDto(
                    ii.ExternalId.ToString(),
                    ii.Name,
                    "LOW_STOCK",
                    $"Quantity {ii.QuantityOnHand} at or below reorder point {ii.ReorderPoint}",
                    (int)ii.QuantityOnHand
                ))
                .ToListAsync();

            alerts.AddRange(lowStockItems);

            // Expiring soon alerts (within 7 days)
            var expiringItems = await _context.InventoryItems
                .Where(ii => ii.OrganizationId == organizationId &&
                    ii.ExpirationDate != null &&
                    ii.ExpirationDate.Value <= now.AddDays(7) &&
                    ii.ExpirationDate.Value > now)
                .Select(ii => new InventoryAlertDto(
                    ii.ExternalId.ToString(),
                    ii.Name,
                    "EXPIRING_SOON",
                    $"Expires {ii.ExpirationDate!.Value:yyyy-MM-dd}",
                    (int)(ii.ExpirationDate.Value - now).TotalDays
                ))
                .ToListAsync();

            alerts.AddRange(expiringItems);

            // Expired alerts
            var expiredItems = await _context.InventoryItems
                .Where(ii => ii.OrganizationId == organizationId &&
                    ii.ExpirationDate != null &&
                    ii.ExpirationDate.Value <= now)
                .Select(ii => new InventoryAlertDto(
                    ii.ExternalId.ToString(),
                    ii.Name,
                    "EXPIRED",
                    $"Expired {ii.ExpirationDate!.Value:yyyy-MM-dd}",
                    0
                ))
                .ToListAsync();

            alerts.AddRange(expiredItems);

            return alerts.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error retrieving inventory alerts: {ex.Message}");
            throw;
        }
    }

    private async Task<RecipeDepletionResult> DepleteRecipeRequirementsAsync(long recipeId, decimal multiplier, Guid organizationId, HashSet<long>? visited = null)
    {
        // Initialize visited set for cycle detection
        visited ??= new HashSet<long>();
        if (!visited.Add(recipeId))
        {
            _logger.LogError("Detected recursive recipe composition involving recipe ID {RecipeId}", recipeId);
            throw new InvalidOperationException($"Recursive recipe composition detected for recipe ID {recipeId}");
        }
        var totalCost = 0m;
        var depletionDetails = new List<string>();

        var ingredients = await _context.RecipeIngredients
            .Where(ri => ri.RecipeId == recipeId && ri.OrganizationId == organizationId && !ri.IsDeleted)
            .ToListAsync();

        foreach (var ingredient in ingredients)
        {
            var quantityToDeplete = ingredient.QuantityRequired * multiplier;
            var unit = ingredient.Unit;

            var availableBatches = await _context.InventoryItems
                .Where(ii => ii.Id == ingredient.InventoryItemId && ii.OrganizationId == organizationId)
                .OrderBy(ii => ii.ExpirationDate)
                .ToListAsync();

            foreach (var invItem in availableBatches)
            {
                if (quantityToDeplete <= 0)
                    break;

                var depletion = Math.Min(quantityToDeplete, invItem.QuantityOnHand);
                invItem.QuantityOnHand -= depletion;
                quantityToDeplete -= depletion;
                totalCost += depletion * ingredient.CostPerUnit;

                depletionDetails.Add($"{invItem.Name}: {depletion}{unit} (Cost: ${depletion * ingredient.CostPerUnit:F2})");
            }

            if (quantityToDeplete > 0)
            {
                _logger.LogWarning("Insufficient inventory for ingredient {IngredientId} - missing {Missing}{Unit}",
                    ingredient.Id, quantityToDeplete, unit);
            }
        }

        var compositions = await _context.RecipeCompositions
            .AsNoTracking()
            .Where(rc => rc.ParentRecipeId == recipeId
                && rc.OrganizationId == organizationId
                && !rc.IsDeleted
                && rc.CompositionType == "RECIPE"
                && rc.SubRecipeId.HasValue)
            .OrderBy(rc => rc.SequenceNumber)
            .ToListAsync();

        foreach (var composition in compositions)
        {
            var subRecipe = await _context.RecipeDetails
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == composition.SubRecipeId!.Value
                    && r.OrganizationId == organizationId
                    && !r.IsDeleted);

            if (subRecipe == null)
                continue;

            var componentProduct = await ResolveRecipeOutputProductAsync(subRecipe, organizationId);

            if (componentProduct?.IsRecipeComponent == true)
            {
                var componentUnitsNeeded = (composition.Quantity ?? 1m) * subRecipe.YieldServingCnt * multiplier;
                var depletion = Math.Min(componentUnitsNeeded, componentProduct.QuantityOnHand);
                var unitCost = subRecipe.CostPerUnit ?? componentProduct.UnitCost ?? 0m;

                componentProduct.QuantityOnHand -= depletion;
                totalCost += depletion * unitCost;

                depletionDetails.Add($"[Component] {componentProduct.Name}: {depletion}{subRecipe.YieldUnit} (Cost: ${depletion * unitCost:F2})");

                if (componentUnitsNeeded > depletion)
                {
                    _logger.LogWarning("Insufficient component inventory for recipe {RecipeId} / product {ProductId} - missing {Missing}{Unit}",
                        subRecipe.Id, componentProduct.Id, componentUnitsNeeded - depletion, subRecipe.YieldUnit);
                }

                continue;
            }

            var childResult = await DepleteRecipeRequirementsAsync(
                subRecipe.Id,
                (composition.Quantity ?? 1m) * multiplier,
                organizationId,
                visited);

            totalCost += childResult.TotalCost;
            depletionDetails.AddRange(childResult.Details);
        }

        // Remove from visited as we unwind recursion so siblings can be processed independently
        visited.Remove(recipeId);

        return new RecipeDepletionResult(totalCost, depletionDetails);
    }

    private async Task<SellableProduct?> ResolveRecipeOutputProductAsync(RecipeDetail recipe, Guid organizationId)
    {
        long? productId = recipe.ProductId;

        if (!productId.HasValue)
        {
            productId = await _context.RecipeProducts
                .AsNoTracking()
                .Where(rp => rp.RecipeId == recipe.Id && rp.OrganizationId == organizationId)
                .OrderByDescending(rp => rp.IsPrimary)
                .Select(rp => (long?)rp.ProductId)
                .FirstOrDefaultAsync();
        }

        if (!productId.HasValue)
            return null;

        return await _context.SellableProducts
            .FirstOrDefaultAsync(p => p.Id == productId.Value && p.OrganizationId == organizationId && p.IsActive);
    }
}
