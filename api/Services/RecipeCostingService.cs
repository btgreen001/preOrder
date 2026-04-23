using OrderMgmt.Models;
using OrderMgmt.DTOs;
using OrderMgmt.Data;
using Microsoft.EntityFrameworkCore;

namespace OrderMgmt.Services;

/// <summary>
/// Service for recipe costing calculations, batch cost computation, and yield management.
/// Calculates total recipe cost from ingredients and distributes across produced units.
/// </summary>
public interface IRecipeCostingService
{
    /// <summary>
    /// Calculate total cost for a recipe based on its ingredients.
    /// Returns cost per unit of finished product after accounting for yield.
    /// </summary>
    Task<RecipeCostResponse> CalculateRecipeCostAsync(Guid recipeExternalId, Guid organizationId);
    
    /// <summary>
    /// Get detailed cost breakdown for a recipe (ingredient costs).
    /// </summary>
    Task<RecipeCostBreakdownDto> GetCostBreakdownAsync(Guid recipeExternalId, Guid organizationId);
    
    /// <summary>
    /// Calculate batch cost by multiplying recipe cost by quantity produced.
    /// </summary>
    Task<decimal> CalculateBatchCostAsync(Guid recipeExternalId, int quantityProduced, Guid organizationId);
    
    /// <summary>
    /// Update batch cost fields after production (actual cost per unit, total cost).
    /// </summary>
    Task UpdateBatchCostAsync(Guid batchExternalId, decimal actualCostPerUnit, Guid organizationId);
}

public class RecipeCostingService : IRecipeCostingService
{
    private readonly OrderMgmtDbContext _context;
    private readonly ILogger<RecipeCostingService> _logger;
    private readonly IUnitConversionService _unitConversionService;

    public RecipeCostingService(OrderMgmtDbContext context, ILogger<RecipeCostingService> logger, IUnitConversionService unitConversionService)
    {
        _context = context;
        _logger = logger;
        _unitConversionService = unitConversionService;
    }

    /// <summary>
    /// Calculate total cost for a recipe from ingredients and sub recipes.
    /// Returns RecipeCostResponse with total cost and cost per unit.
    /// </summary>
    public async Task<RecipeCostResponse> CalculateRecipeCostAsync(Guid recipeExternalId, Guid organizationId)
    {
        try
        {
            // Get recipe with ingredients and sub-recipe compositions
            var recipe = await _context.RecipeDetails
                .AsNoTracking()
                .Where(r => r.ExternalId == recipeExternalId && r.OrganizationId == organizationId)
                .Include(r => r.Ingredients)
                    .ThenInclude(i => i.InventoryItem)
                .Include(r => r.Ingredients)
                    .ThenInclude(i => i.RecipeComponentProduct)
                .Include(r => r.Composition)
                    .ThenInclude(c => c.SubRecipe)
                .FirstOrDefaultAsync();

            if (recipe == null)
            {
                _logger.LogWarning($"Recipe {recipeExternalId} not found for org {organizationId}");
                throw new InvalidOperationException("Recipe not found");
            }

            // Calculate total ingredient cost based on CURRENT inventory unit costs (with conversion when needed)
            decimal totalCost = 0m;
            foreach (var ingredient in recipe.Ingredients)
            {
                try
                {
                    var currentUnitCost = await ResolveCurrentUnitCostAsync(ingredient, organizationId);

                    var ingredientCost = ingredient.QuantityRequired * currentUnitCost;
                    totalCost += ingredientCost;
                    _logger.LogInformation($"Ingredient current cost: {ingredient.QuantityRequired} × {currentUnitCost} = {ingredientCost}");
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Unit conversion failed for ingredient {IngredientExternalId}, using snapshot/inventory unit cost fallback.", ingredient.ExternalId);
                    var fallbackUnitCost = ingredient.CostPerUnit > 0
                        ? ingredient.CostPerUnit
                        : (ingredient.InventoryItem?.UnitCost
                            ?? ingredient.RecipeComponentProduct?.UnitCost
                            ?? 0m);
                    var ingredientCost = ingredient.QuantityRequired * fallbackUnitCost;
                    totalCost += ingredientCost;
                    _logger.LogInformation($"Ingredient fallback cost: {ingredient.QuantityRequired} × {fallbackUnitCost} = {ingredientCost}");
                }
            }

            // Add costs from sub-recipes (compositions of type RECIPE) — up to depth 2
            foreach (var composition in recipe.Composition
                .Where(c => !c.IsDeleted && c.CompositionType == "RECIPE" && c.SubRecipe != null))
            {
                try
                {
                    var subCost = await CalculateRecipeCostAsync(composition.SubRecipe!.ExternalId, organizationId);
                    // cost of one full sub-recipe batch × number of batches used in this composition
                    var subBatchTotalCost = subCost.CostPerUnit * subCost.YieldServingCnt;
                    var compositionBatches = composition.Quantity ?? 1m;
                    totalCost += subBatchTotalCost * compositionBatches;
                    _logger.LogInformation(
                        $"Sub-recipe '{composition.SubRecipe!.RecipeName}': {compositionBatches} × {subBatchTotalCost} = {subBatchTotalCost * compositionBatches}");
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex,
                        "Failed to calculate cost for sub-recipe composition {CompositionExternalId}, skipping",
                        composition.ExternalId);
                }
            }

            // Calculate current cost per unit
            decimal costPerUnit = recipe.YieldServingCnt > 0
                ? totalCost / recipe.YieldServingCnt
                : 0m;

            _logger.LogInformation($"Recipe {recipeExternalId}: CurrentTotal={totalCost}, Yield={recipe.YieldServingCnt}, CurrentCostPerUnit={costPerUnit}");

            return new RecipeCostResponse(
                RecipeExternalId: recipeExternalId,
                TotalIngredientCost: totalCost,
                YieldServingCnt: recipe.YieldServingCnt,
                YieldUnit: recipe.YieldUnit,
                CostPerUnit: costPerUnit
            );
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error calculating recipe cost: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Get detailed cost breakdown showing each ingredient's contribution.
    /// </summary>
    public async Task<RecipeCostBreakdownDto> GetCostBreakdownAsync(Guid recipeExternalId, Guid organizationId)
    {
        try
        {
            var recipe = await _context.RecipeDetails
                .AsNoTracking()
                .Where(r => r.ExternalId == recipeExternalId && r.OrganizationId == organizationId)
                .Include(r => r.Ingredients)
                    .ThenInclude(i => i.InventoryItem)
                .Include(r => r.Ingredients)
                    .ThenInclude(i => i.RecipeComponentProduct)
                .Include(r => r.Composition)
                    .ThenInclude(c => c.SubRecipe)
                .FirstOrDefaultAsync();

            if (recipe == null)
                throw new InvalidOperationException("Recipe not found");

            var ingredientBreakdowns = new List<IngredientCostLine>();
            decimal totalCost = 0m;

            foreach (var ingredient in recipe.Ingredients)
            {
                // initial snapshot cost
                var ingredientCost = ingredient.QuantityRequired * ingredient.CostPerUnit;

                // compute current inventory-based cost (with conversion when needed)
                decimal currentUnitCost = ingredient.CostPerUnit;
                decimal currentTotalCost = ingredientCost;

                try
                {
                    currentUnitCost = await ResolveCurrentUnitCostAsync(ingredient, organizationId);
                    currentTotalCost = ingredient.QuantityRequired * currentUnitCost;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Unit conversion failed for ingredient {IngredientExternalId} in breakdown, using snapshot/inventory fallback.", ingredient.ExternalId);
                }

                // accumulate using CURRENT total cost so totals/percentages reflect inventory-based costs
                totalCost += currentTotalCost;

                ingredientBreakdowns.Add(new IngredientCostLine
                {
                    InventoryItemExternalId = ingredient.InventoryItem?.ExternalId ?? ingredient.RecipeComponentProduct?.ExternalId,
                    ItemName = ingredient.InventoryItem?.Name ?? ingredient.RecipeComponentProduct?.Name ?? string.Empty,
                    Quantity = ingredient.QuantityRequired,
                    Unit = ingredient.Unit ?? string.Empty,
                    CostPerUnit = ingredient.CostPerUnit,
                    TotalCost = ingredientCost,
                    CurrentCostPerUnit = currentUnitCost,
                    CurrentTotalCost = currentTotalCost,
                    PercentageOfTotal = 0m // Will be calculated below
                });
            }

            // Add sub-recipe composition costs as rollup lines
            foreach (var composition in recipe.Composition
                .Where(c => !c.IsDeleted && c.CompositionType == "RECIPE" && c.SubRecipe != null))
            {
                try
                {
                    var subCost = await CalculateRecipeCostAsync(composition.SubRecipe!.ExternalId, organizationId);
                    var subBatchTotalCost = subCost.CostPerUnit * subCost.YieldServingCnt;
                    var compositionBatches = composition.Quantity ?? 1m;
                    var subContribution = subBatchTotalCost * compositionBatches;
                    totalCost += subContribution;

                    ingredientBreakdowns.Add(new IngredientCostLine
                    {
                        InventoryItemExternalId = null,
                        ItemName = $"[Sub-recipe] {composition.SubRecipe!.RecipeName}",
                        Quantity = compositionBatches,
                        Unit = composition.Unit ?? "batch",
                        CostPerUnit = subBatchTotalCost,
                        TotalCost = subContribution,
                        CurrentCostPerUnit = subBatchTotalCost,
                        CurrentTotalCost = subContribution,
                        PercentageOfTotal = 0m
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex,
                        "Failed to get breakdown cost for sub-recipe composition {CompositionExternalId}, skipping",
                        composition.ExternalId);
                }
            }

            // Calculate percentages
            foreach (var line in ingredientBreakdowns)
            {
                line.PercentageOfTotal = totalCost > 0 ? (line.CurrentTotalCost / totalCost) * 100 : 0m;
            }

            return new RecipeCostBreakdownDto
            {
                RecipeExternalId = recipeExternalId,
                RecipeName = recipe.RecipeName,
                TotalCost = totalCost,
                CostPerUnit = recipe.YieldServingCnt > 0 ? totalCost / recipe.YieldServingCnt : 0m,
                YieldServingCnt = recipe.YieldServingCnt,
                YieldUnit = recipe.YieldUnit,
                IngredientLines = ingredientBreakdowns
            };
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting cost breakdown: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Calculate total batch cost (recipe cost × quantity produced).
    /// </summary>
    public async Task<decimal> CalculateBatchCostAsync(Guid recipeExternalId, int quantityProduced, Guid organizationId)
    {
        try
        {
            if (quantityProduced <= 0)
                throw new InvalidOperationException("Quantity produced must be greater than 0");

            var costResponse = await CalculateRecipeCostAsync(recipeExternalId, organizationId);
            decimal batchTotalCost = costResponse.CostPerUnit * quantityProduced;

            _logger.LogInformation($"Batch cost: {costResponse.CostPerUnit} × {quantityProduced} = {batchTotalCost}");
            return batchTotalCost;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error calculating batch cost: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Update batch cost fields after production completion.
    /// </summary>
    public async Task UpdateBatchCostAsync(Guid batchExternalId, decimal actualCostPerUnit, Guid organizationId)
    {
        try
        {
            var batch = await _context.FinishedGoodsBatches
                .FirstOrDefaultAsync(b => b.ExternalId == batchExternalId && b.OrganizationId == organizationId);

            if (batch == null)
                throw new InvalidOperationException("Batch not found");

            batch.CostPerUnit = actualCostPerUnit;
            batch.UpdatedAt = DateTime.UtcNow;
            batch.UpdatedBy = "system"; // TODO: Get from JWT claims

            await _context.SaveChangesAsync();
            _logger.LogInformation($"Updated batch {batchExternalId} cost per unit to {actualCostPerUnit}");
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error updating batch cost: {ex.Message}");
            throw;
        }
    }

    private async Task<decimal> ResolveCurrentUnitCostAsync(RecipeIngredient ingredient, Guid organizationId)
    {
        var ingredientUnit = (ingredient.Unit ?? string.Empty).Trim();

        if (ingredient.InventoryItem != null)
        {
            var sourceUnitCost = ingredient.InventoryItem.UnitCost;
            var sourceUnit = (ingredient.InventoryItem.UnitOfMeasure ?? string.Empty).Trim();

            try
            {
                return await ConvertCostPerUnitAsync(
                    organizationId,
                    sourceUnitCost,
                    sourceUnit,
                    ingredientUnit,
                    ingredient.InventoryItem.ExternalId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Inventory conversion failed for ingredient {IngredientExternalId}; using inventory unit cost fallback.",
                    ingredient.ExternalId);
                return sourceUnitCost;
            }
        }

        if (ingredient.RecipeComponentProduct != null)
        {
            // Look up the recipe that produces this component (prefer Active, then highest version).
            // RecipeDetail.ProductId is the FK to SellableProduct.Id, which matches RecipeComponentProduct.Id.
            var producingRecipe = await _context.RecipeDetails
                .AsNoTracking()
                .Where(r => r.ProductId == ingredient.RecipeComponentProduct.Id
                         && r.OrganizationId == organizationId
                         && !r.IsDeleted)
                .OrderByDescending(r => r.RecipeStatusCd == 'A')   // Active preferred
                .ThenByDescending(r => r.RecipeVersionNbr)
                .FirstOrDefaultAsync();

            if (producingRecipe != null)
            {
                // Recursively compute the live recipe cost (safe: recipes are max 2 levels deep,
                // so this call will bottom out at inventory items only).
                var componentCost = await CalculateRecipeCostAsync(producingRecipe.ExternalId, organizationId);
                var sourceUnitCost = componentCost.CostPerUnit;
                var sourceUnit = (componentCost.YieldUnit ?? string.Empty).Trim();

                try
                {
                    return await ConvertCostPerUnitAsync(
                        organizationId,
                        sourceUnitCost,
                        sourceUnit,
                        ingredientUnit,
                        ingredient.RecipeComponentProduct.ExternalId);
                }
                catch (Exception ex)
                {
                    var componentFallback = ingredient.RecipeComponentProduct.UnitCost ?? ingredient.CostPerUnit;
                    _logger.LogWarning(
                        ex,
                        "Recipe-component conversion failed for ingredient {IngredientExternalId}; using component fallback unit cost {FallbackUnitCost}.",
                        ingredient.ExternalId,
                        componentFallback);
                    return componentFallback;
                }
            }

            // Fallback: no producing recipe found — use the flat stored unit cost on the SellableProduct.
            _logger.LogWarning(
                "No producing recipe found for recipe component product {ComponentExternalId}; falling back to stored UnitCost.",
                ingredient.RecipeComponentProduct.ExternalId);
            var fallbackUnitCost = ingredient.RecipeComponentProduct.UnitCost ?? ingredient.CostPerUnit;
            var fallbackSourceUnit = (ingredient.RecipeComponentProduct.OutputUnitMsr ?? string.Empty).Trim();

            return await ConvertCostPerUnitAsync(
                organizationId,
                fallbackUnitCost,
                fallbackSourceUnit,
                ingredientUnit,
                ingredient.RecipeComponentProduct.ExternalId);
        }

        return ingredient.CostPerUnit;
    }

    private async Task<decimal> ConvertCostPerUnitAsync(
        Guid organizationId,
        decimal sourceUnitCost,
        string sourceUnit,
        string targetUnit,
        Guid sourceItemExternalId)
    {
        if (sourceUnitCost < 0)
        {
            return sourceUnitCost;
        }

        if (string.IsNullOrWhiteSpace(sourceUnit) || string.IsNullOrWhiteSpace(targetUnit) ||
            string.Equals(sourceUnit, targetUnit, StringComparison.OrdinalIgnoreCase))
        {
            return sourceUnitCost;
        }

        var convertReq = new ConvertUnitRequest
        {
            Value = 1m,
            FromUnit = targetUnit,
            ToUnit = sourceUnit,
            InventoryItemExternalId = sourceItemExternalId
        };

        var convertResp = await _unitConversionService.ConvertAsync(organizationId, convertReq);
        if (convertResp.ConvertedValue <= 0)
        {
            throw new InvalidOperationException(
                $"Invalid conversion factor for cost conversion {targetUnit} -> {sourceUnit}");
        }

        return sourceUnitCost * convertResp.ConvertedValue;
    }
}
