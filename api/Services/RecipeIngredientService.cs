using Microsoft.EntityFrameworkCore;
using PreOrderApp.Data;
using PreOrderApp.DTOs;
using PreOrderApp.Infrastructure;
using PreOrderApp.Models;

namespace PreOrderApp.Services;

public interface IRecipeIngredientService
{
    Task<RecipeIngredientDto> CreateIngredientAsync(CreateRecipeIngredientRequest request, Guid organizationId, Guid createdBy);
    Task<List<RecipeIngredientDto>> GetIngredientsByRecipeAsync(Guid recipeExternalId, Guid organizationId);
    Task<List<RecipeIngredientWithCostDto>> GetIngredientsByRecipeWithCostAsync(Guid recipeExternalId, Guid organizationId);
    Task<RecipeIngredientDto?> GetIngredientByIdAsync(Guid ingredientExternalId, Guid organizationId);
    Task<RecipeIngredientDto> UpdateIngredientAsync(Guid externalId, UpdateRecipeIngredientRequest request, Guid organizationId, Guid updatedBy);
    Task DeleteIngredientAsync(Guid externalId, Guid organizationId, Guid deletedBy);
    Task ReorderIngredientsAsync(Guid recipeExternalId, ReorderIngredientsRequest request, Guid organizationId, Guid updatedBy);
}

public class RecipeIngredientService : IRecipeIngredientService
{
        private readonly AppDbContext _context;
        private readonly ILogger<RecipeIngredientService> _logger;

        public RecipeIngredientService(AppDbContext context, ILogger<RecipeIngredientService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<RecipeIngredientDto> CreateIngredientAsync(CreateRecipeIngredientRequest request, Guid organizationId, Guid createdBy)
    {
        try
        {
            if (string.IsNullOrEmpty(request.RecipeExternalId))
                throw new InvalidOperationException($"Recipe with external ID {request.RecipeExternalId} is incorrect or empty");

            bool hasInventory = request.InventoryItemExternalId.HasValue;
            bool hasComponent = request.RecipeComponentProductExternalId.HasValue;

            if (!hasInventory && !hasComponent)
                throw new ArgumentException("Either InventoryItemExternalId or RecipeComponentProductExternalId must be provided");
            if (hasInventory && hasComponent)
                throw new ArgumentException("Only one of InventoryItemExternalId or RecipeComponentProductExternalId may be provided");

            var recipeExternalId = Guid.Parse(request.RecipeExternalId);
            var recipe = await _context.RecipeDetails
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.ExternalId == recipeExternalId && r.OrganizationId == organizationId && !r.IsDeleted);
            if (recipe == null)
                throw new InvalidOperationException($"Recipe with external ID {request.RecipeExternalId} not found or does not belong to organization");

            if (request.QuantityRequired <= 0)
                throw new ArgumentException("Quantity required must be greater than 0");
            if (string.IsNullOrWhiteSpace(request.Unit))
                throw new ArgumentException("Unit cannot be empty");

            var maxSeq = await _context.RecipeIngredients
                .Where(ri => ri.RecipeId == recipe.Id && !ri.IsDeleted)
                .MaxAsync(ri => (int?)ri.SequenceNumber) ?? -1;

            var ingredient = new RecipeIngredient
            {
                ExternalId = Guid.NewGuid(),
                OrganizationId = organizationId,
                RecipeId = recipe.Id,
                QuantityRequired = request.QuantityRequired,
                Unit = request.Unit.Trim(),
                PurposeText = request.PurposeTxt?.Trim(),
                CostPerUnit = request.CostPerUnit,
                SequenceNumber = maxSeq + 1,
                SectionName = await ResolveSectionNameAsync(recipe.Id, request.SectionName),
                CreatedBy = createdBy,
                CreatedAt = DateTime.UtcNow,
                UpdatedBy = createdBy,
                UpdatedAt = DateTime.UtcNow,
                VersionNbr = 1,
                IsDeleted = false
            };

            if (hasInventory)
            {
                var inventoryItem = await _context.InventoryItems
                    .AsNoTracking()
                    .FirstOrDefaultAsync(i => i.ExternalId == request.InventoryItemExternalId!.Value && i.OrganizationId == organizationId && i.IsActive);
                if (inventoryItem == null)
                    throw new InvalidOperationException($"Inventory item {request.InventoryItemExternalId} not found or does not belong to organization");
                ingredient.InventoryItemId = inventoryItem.Id;
                ingredient.InventoryItem = inventoryItem; // set nav so MapToDto works without a reload
            }
            else
            {
                var componentProduct = await _context.SellableProducts
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.ExternalId == request.RecipeComponentProductExternalId!.Value && p.OrganizationId == organizationId && p.IsActive);
                if (componentProduct == null)
                    throw new InvalidOperationException($"Recipe component product {request.RecipeComponentProductExternalId} not found or does not belong to organization");
                ingredient.RecipeComponentProductId = componentProduct.Id;
                ingredient.RecipeComponentProduct = componentProduct; // set nav so MapToDto works without a reload
            }

            _context.RecipeIngredients.Add(ingredient);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created recipe ingredient {ExternalId} for recipe {RecipeId}",
                ingredient.ExternalId, request.RecipeExternalId);

            return MapToDto(ingredient, recipe.ExternalId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating recipe ingredient for recipe {RecipeId}", request.RecipeExternalId);
            throw;
        }
    }

    public async Task<List<RecipeIngredientDto>> GetIngredientsByRecipeAsync(Guid recipeExternalId, Guid organizationId)
    {
        try
        {
            var ingredients = await _context.RecipeIngredients
                .AsNoTracking()
                .Include(ri => ri.Recipe)
                .Include(ri => ri.InventoryItem)
                .Include(ri => ri.RecipeComponentProduct)
                .Where(ri => ri.Recipe!.ExternalId == recipeExternalId 
                    && ri.OrganizationId == organizationId 
                    && !ri.IsDeleted
                    && !ri.Recipe.IsDeleted)
                .OrderBy(ri => ri.SequenceNumber)
                .ThenBy(ri => ri.CreatedAt)
                .ToListAsync();

            return ingredients.Select(i => MapToDto(i, i.Recipe!.ExternalId)).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting ingredients for recipe {RecipeId}", recipeExternalId);
            throw;
        }
    }

    public async Task<List<RecipeIngredientWithCostDto>> GetIngredientsByRecipeWithCostAsync(Guid recipeExternalId, Guid organizationId)
    {
        try
        {
            var ingredients = await _context.RecipeIngredients
                .AsNoTracking()
                .Include(ri => ri.Recipe)
                .Include(ri => ri.InventoryItem)
                .Include(ri => ri.RecipeComponentProduct)
                .Where(ri => ri.Recipe!.ExternalId == recipeExternalId
                    && ri.OrganizationId == organizationId
                    && !ri.IsDeleted
                    && !ri.Recipe.IsDeleted)
                .OrderBy(ri => ri.SequenceNumber)
                .ThenBy(ri => ri.CreatedAt)
                .ToListAsync();

            return ingredients.Select(i => MapToAdminDto(i, i.Recipe!.ExternalId)).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting ingredients with cost for recipe {RecipeId}", recipeExternalId);
            throw;
        }
    }

    public async Task<RecipeIngredientDto?> GetIngredientByIdAsync(Guid ingredientExternalId, Guid organizationId)
    {
        try
        {
            var ingredient = await _context.RecipeIngredients
                .AsNoTracking()
                .Include(ri => ri.Recipe)
                .Include(ri => ri.InventoryItem)
                .Include(ri => ri.RecipeComponentProduct)
                .FirstOrDefaultAsync(ri => ri.ExternalId == ingredientExternalId 
                    && ri.OrganizationId == organizationId 
                    && !ri.IsDeleted);

            if (ingredient == null)
                return null;

            return MapToDto(ingredient, ingredient.Recipe!.ExternalId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recipe ingredient {ExternalId}", ingredientExternalId);
            throw;
        }
    }

    public async Task<RecipeIngredientDto> UpdateIngredientAsync(Guid externalId, UpdateRecipeIngredientRequest request, Guid organizationId, Guid updatedBy)
    {
        try
        {
            var ingredient = await _context.RecipeIngredients
                .Include(ri => ri.Recipe)
                .Include(ri => ri.InventoryItem)
                .Include(ri => ri.RecipeComponentProduct)
                .FirstOrDefaultAsync(ri => ri.ExternalId == externalId 
                    && ri.OrganizationId == organizationId 
                    && !ri.IsDeleted);

            if (ingredient == null)
            {
                throw new InvalidOperationException($"Recipe ingredient with external ID {externalId} not found");
            }

            // Use reusable optimistic locking extension
            await _context.UpdateWithVersionCheckAsync<RecipeIngredient>(
                ingredient,
                request.VersionNbr,
                "RecipeIngredient",
                ingredient.InventoryItem?.Name ?? ingredient.RecipeComponentProduct?.Name ?? "Unknown",
                i =>
                {
                    // Update fields if provided
                    if (request.QuantityRequired.HasValue)
                    {
                        if (request.QuantityRequired.Value <= 0)
                            throw new ArgumentException("Quantity required must be greater than 0");
                        i.QuantityRequired = request.QuantityRequired.Value;
                    }

                    if (!string.IsNullOrWhiteSpace(request.Unit))
                    {
                        i.Unit = request.Unit.Trim();
                    }

                    if (request.PurposeTxt != null) // Allow clearing purpose by passing empty string
                    {
                        i.PurposeText = string.IsNullOrWhiteSpace(request.PurposeTxt) ? null : request.PurposeTxt.Trim();
                    }

                    if (request.CostPerUnit.HasValue)
                    {
                        i.CostPerUnit = request.CostPerUnit.Value;
                    }

                    if (request.SectionName != null)
                    {
                        i.SectionName = string.IsNullOrWhiteSpace(request.SectionName)
                            ? null
                            : request.SectionName.Trim();
                    }

                    i.UpdatedBy = updatedBy;
                    i.UpdatedAt = DateTime.UtcNow;
                },
                _logger);

            _logger.LogInformation("Updated recipe ingredient {ExternalId}", externalId);

            return MapToDto(ingredient, ingredient.Recipe!.ExternalId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating recipe ingredient {ExternalId}", externalId);
            throw;
        }
    }

    public async Task DeleteIngredientAsync(Guid externalId, Guid organizationId, Guid deletedBy)
    {
        try
        {
            var ingredient = await _context.RecipeIngredients
                .AsNoTracking()
                .FirstOrDefaultAsync(ri => ri.ExternalId == externalId 
                    && ri.OrganizationId == organizationId 
                    && !ri.IsDeleted);

            if (ingredient == null)
            {
                throw new InvalidOperationException($"Recipe ingredient with external ID {externalId} not found");
            }

            ingredient.IsDeleted = true;
            ingredient.UpdatedBy = deletedBy;
            ingredient.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Soft deleted recipe ingredient {ExternalId}", externalId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting recipe ingredient {ExternalId}", externalId);
            throw;
        }
    }

    private static RecipeIngredientDto MapToDto(RecipeIngredient ingredient, Guid recipeExternalId)
    {
        bool isComponent = ingredient.RecipeComponentProductId.HasValue;
        return new RecipeIngredientDto
        {
            ExternalId = ingredient.ExternalId,
            RecipeExternalId = recipeExternalId,
            SourceType = isComponent ? "recipe_component" : "inventory",
            InventoryItemExternalId = ingredient.InventoryItem?.ExternalId,
            InventoryItemName = ingredient.InventoryItem?.Name,
            InventoryItemSku = ingredient.InventoryItem?.Sku,
            RecipeComponentProductExternalId = ingredient.RecipeComponentProduct?.ExternalId,
            RecipeComponentProductName = ingredient.RecipeComponentProduct?.Name,
            RecipeComponentProductSku = ingredient.RecipeComponentProduct?.Sku,
            QuantityRequired = ingredient.QuantityRequired,
            Unit = ingredient.Unit,
            PurposeTxt = ingredient.PurposeText,
            SectionName = ingredient.SectionName,
            SequenceNumber = ingredient.SequenceNumber
        };
    }

    private static RecipeIngredientWithCostDto MapToAdminDto(RecipeIngredient ingredient, Guid recipeExternalId)
    {
        bool isComponent = ingredient.RecipeComponentProductId.HasValue;
        return new RecipeIngredientWithCostDto
        {
            ExternalId = ingredient.ExternalId,
            RecipeExternalId = recipeExternalId,
            SourceType = isComponent ? "recipe_component" : "inventory",
            InventoryItemExternalId = ingredient.InventoryItem?.ExternalId,
            InventoryItemName = ingredient.InventoryItem?.Name,
            InventoryItemSku = ingredient.InventoryItem?.Sku,
            RecipeComponentProductExternalId = ingredient.RecipeComponentProduct?.ExternalId,
            RecipeComponentProductName = ingredient.RecipeComponentProduct?.Name,
            RecipeComponentProductSku = ingredient.RecipeComponentProduct?.Sku,
            QuantityRequired = ingredient.QuantityRequired,
            Unit = ingredient.Unit,
            PurposeTxt = ingredient.PurposeText,
            SectionName = ingredient.SectionName,
            SequenceNumber = ingredient.SequenceNumber,
            CostPerUnit = ingredient.CostPerUnit,
            TotalCost = ingredient.CostPerUnit * ingredient.QuantityRequired
        };
    }

    public async Task ReorderIngredientsAsync(Guid recipeExternalId, ReorderIngredientsRequest request, Guid organizationId, Guid updatedBy)
    {
        try
        {
            var recipe = await _context.RecipeDetails
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.ExternalId == recipeExternalId && r.OrganizationId == organizationId && !r.IsDeleted);

            if (recipe == null)
                throw new InvalidOperationException($"Recipe {recipeExternalId} not found or does not belong to organization");

            var externalIds = request.Sequences.Select(s => s.ExternalId).ToList();
            var ingredients = await _context.RecipeIngredients
                .Where(ri => externalIds.Contains(ri.ExternalId)
                          && ri.RecipeId == recipe.Id
                          && ri.OrganizationId == organizationId
                          && !ri.IsDeleted)
                .ToListAsync();

            var seqMap = request.Sequences.ToDictionary(s => s.ExternalId, s => s.SequenceNumber);
            foreach (var ingredient in ingredients)
            {
                if (seqMap.TryGetValue(ingredient.ExternalId, out var seq))
                {
                    ingredient.SequenceNumber = seq;
                    ingredient.UpdatedBy = updatedBy;
                    ingredient.UpdatedAt = DateTime.UtcNow;
                    ingredient.VersionNbr += 1;
                }
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Reordered {Count} ingredients for recipe {RecipeId}", ingredients.Count, recipeExternalId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reordering ingredients for recipe {RecipeId}", recipeExternalId);
            throw;
        }
    }

    /// <summary>
    /// Determines the section name for a new ingredient. If not provided, defaults to:
    /// - Recipe name when the recipe is used as a sub-recipe in any composition
    /// - "Assembly and Production" for top-level ingredients
    /// </summary>
    private async Task<string?> ResolveSectionNameAsync(long recipeId, string? requestedSectionName)
    {
        if (!string.IsNullOrWhiteSpace(requestedSectionName))
            return requestedSectionName.Trim();

        // If this recipe is referenced as a sub-recipe anywhere, use recipe name as section
        var parentComposition = await _context.RecipeCompositions
            .AsNoTracking()
            .Include(c => c.ParentRecipe)
            .FirstOrDefaultAsync(c => c.SubRecipeId == recipeId && !c.IsDeleted);

        if (parentComposition != null)
            return parentComposition.ParentRecipe?.RecipeName ?? "Assembly and Production";

        // Default for top-level ingredients
        return "Assembly and Production";
    }
}
