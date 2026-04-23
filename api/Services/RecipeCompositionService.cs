using Microsoft.EntityFrameworkCore;
using PreOrderApp.Data;
using PreOrderApp.DTOs;
using PreOrderApp.Infrastructure;
using PreOrderApp.Models;

namespace PreOrderApp.Services;

public interface IRecipeCompositionService
{
    Task<RecipeCompositionDto> CreateCompositionAsync(CreateRecipeCompositionRequest request, Guid organizationId, Guid createdBy);
    Task<List<RecipeCompositionDto>> GetCompositionsByRecipeAsync(Guid recipeExternalId, Guid organizationId);
    Task<RecipeCompositionDto?> GetCompositionByIdAsync(Guid compositionExternalId, Guid organizationId);
    Task<RecipeCompositionDto> UpdateCompositionAsync(Guid externalId, UpdateRecipeCompositionRequest request, Guid organizationId, Guid updatedBy);
    Task DeleteCompositionAsync(Guid externalId, Guid organizationId, Guid deletedBy);
}

public class RecipeCompositionService : IRecipeCompositionService
{
        private readonly AppDbContext _context;
        private readonly ILogger<RecipeCompositionService> _logger;

        public RecipeCompositionService(AppDbContext context, ILogger<RecipeCompositionService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<RecipeCompositionDto> CreateCompositionAsync(CreateRecipeCompositionRequest request, Guid organizationId, Guid createdBy)
    {
        try
        {
            // Validate parent recipe exists and belongs to org
            var parentRecipe = await _context.RecipeDetails
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.ExternalId == request.ParentRecipeExternalId && r.OrganizationId == organizationId && !r.IsDeleted);

            if (parentRecipe == null)
            {
                throw new InvalidOperationException($"Parent recipe with external ID {request.ParentRecipeExternalId} not found or does not belong to organization");
            }

            // Validate composition type
            var compositionType = request.CompositionType?.Trim().ToUpperInvariant() ?? "RECIPE";
            if (compositionType != "RECIPE" && compositionType != "STEP")
                throw new ArgumentException("Invalid composition type. Must be RECIPE or STEP");

            RecipeDetail? subRecipe = null;
            if (compositionType == "RECIPE")
            {
                if (!request.SubRecipeExternalId.HasValue)
                    throw new ArgumentException("SubRecipeExternalId required for RECIPE type");

                // Validate sub-recipe exists and belongs to org
                subRecipe = await _context.RecipeDetails
                    .AsNoTracking()
                    .FirstOrDefaultAsync(r => r.ExternalId == request.SubRecipeExternalId.Value && r.OrganizationId == organizationId && !r.IsDeleted);

                if (subRecipe == null)
                    throw new InvalidOperationException($"Sub-recipe with external ID {request.SubRecipeExternalId.Value} not found or does not belong to organization");

                // Prevent self-reference
                if (parentRecipe.Id == subRecipe.Id)
                    throw new InvalidOperationException("A recipe cannot be its own sub-recipe (self-reference not allowed)");

                // Validate composition depth (reject if result would exceed depth 2)
                var parentDepth = await CalculateRecipeDepthAsync(parentRecipe.Id, organizationId);
                var subDepth = await CalculateRecipeDepthAsync(subRecipe.Id, organizationId);
                var resultingDepth = Math.Max(parentDepth, subDepth + 1);
                
                if (resultingDepth > 2)
                    throw new InvalidOperationException($"Cannot add sub-recipe: composition would reach depth {resultingDepth}. Maximum allowed depth is 2 (parent at depth {parentDepth}, sub-recipe at depth {subDepth}).");

                // Validate quantity/unit for recipe type
                if (!request.Quantity.HasValue || request.Quantity.Value <= 0)
                    throw new ArgumentException("Quantity must be greater than 0 for RECIPE type");
                if (string.IsNullOrWhiteSpace(request.Unit))
                    throw new ArgumentException("Unit required for RECIPE type");
            }
            else // STEP
            {
                if (string.IsNullOrWhiteSpace(request.StepText))
                    throw new ArgumentException("StepText required for STEP type");
            }

            var composition = new RecipeComposition
            {
                ExternalId = Guid.NewGuid(),
                OrganizationId = organizationId,
                ParentRecipeId = parentRecipe.Id,
                CompositionType = compositionType,
                SubRecipeId = subRecipe?.Id,
                StepText = compositionType == "STEP" ? request.StepText?.Trim() : null,
                SectionName = (request.SectionName ?? string.Empty).Trim(),
                SequenceNumber = request.SequenceNumber,
                Quantity = compositionType == "RECIPE" ? request.Quantity : null,
                Unit = compositionType == "RECIPE" ? request.Unit?.Trim() ?? "batch" : null,
                CreatedBy = createdBy,
                CreatedAt = DateTime.UtcNow,
                UpdatedBy = createdBy,
                UpdatedAt = DateTime.UtcNow,
                VersionNbr = 1,
                IsDeleted = false
            };

            _context.RecipeCompositions.Add(composition);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created recipe composition {ExternalId} for parent recipe {ParentId} with sub-recipe {SubId}",
                composition.ExternalId, request.ParentRecipeExternalId, request.SubRecipeExternalId);

            return MapToDto(composition, parentRecipe.ExternalId, parentRecipe.RecipeName, subRecipe?.ExternalId, subRecipe?.RecipeName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating recipe composition for parent recipe {ParentId}", request.ParentRecipeExternalId);
            throw;
        }
    }

    public async Task<List<RecipeCompositionDto>> GetCompositionsByRecipeAsync(Guid recipeExternalId, Guid organizationId)
    {
        try
        {
            var compositions = await _context.RecipeCompositions
                .AsNoTracking()
                .Include(rc => rc.ParentRecipe)
                .Include(rc => rc.SubRecipe)
                .Where(rc => rc.ParentRecipe!.ExternalId == recipeExternalId 
                    && rc.OrganizationId == organizationId 
                    && !rc.IsDeleted
                    && !rc.ParentRecipe.IsDeleted)
                .OrderBy(rc => rc.SequenceNumber)
                .ToListAsync();

            return compositions.Select(c => MapToDto(c, 
                c.ParentRecipe!.ExternalId, 
                c.ParentRecipe!.RecipeName, 
                c.SubRecipe?.ExternalId, 
                c.SubRecipe?.RecipeName)).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting compositions for recipe {RecipeId}", recipeExternalId);
            throw;
        }
    }

    public async Task<RecipeCompositionDto?> GetCompositionByIdAsync(Guid compositionExternalId, Guid organizationId)
    {
        try
        {
            var composition = await _context.RecipeCompositions
                .AsNoTracking()
                .Include(rc => rc.ParentRecipe)
                .Include(rc => rc.SubRecipe)
                .FirstOrDefaultAsync(rc => rc.ExternalId == compositionExternalId 
                    && rc.OrganizationId == organizationId 
                    && !rc.IsDeleted);

            if (composition == null)
                return null;

            return MapToDto(composition, 
                composition.ParentRecipe!.ExternalId, 
                composition.ParentRecipe!.RecipeName, 
                composition.SubRecipe?.ExternalId, 
                composition.SubRecipe?.RecipeName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recipe composition {ExternalId}", compositionExternalId);
            throw;
        }
    }

    public async Task<RecipeCompositionDto> UpdateCompositionAsync(Guid externalId, UpdateRecipeCompositionRequest request, Guid organizationId, Guid updatedBy)
    {
        try
        {
            var composition = await _context.RecipeCompositions
                .Include(rc => rc.ParentRecipe)
                .Include(rc => rc.SubRecipe)
                .FirstOrDefaultAsync(rc => rc.ExternalId == externalId 
                    && rc.OrganizationId == organizationId 
                    && !rc.IsDeleted);

            if (composition == null)
            {
                throw new InvalidOperationException($"Recipe composition with external ID {externalId} not found");
            }

            // Use reusable optimistic locking extension
            await _context.UpdateWithVersionCheckAsync<RecipeComposition>(
                composition,
                request.VersionNbr,
                "RecipeComposition",
                composition.SectionName ?? "Composition",
                c =>
                {
                    // Update fields if provided
                    if (request.SectionName != null)
                    {
                        c.SectionName = string.IsNullOrWhiteSpace(request.SectionName)
                            ? string.Empty
                            : request.SectionName.Trim();
                    }

                    if (request.SequenceNumber.HasValue)
                    {
                        c.SequenceNumber = request.SequenceNumber.Value;
                    }

                    // Handle type-specific updates
                    if (c.CompositionType == "RECIPE")
                    {
                        if (request.Quantity.HasValue)
                        {
                            if (request.Quantity.Value <= 0)
                                throw new ArgumentException("Quantity must be greater than 0");
                            c.Quantity = request.Quantity.Value;
                        }

                        if (!string.IsNullOrWhiteSpace(request.Unit))
                        {
                            c.Unit = request.Unit.Trim();
                        }
                    }
                    else if (c.CompositionType == "STEP")
                    {
                        // For STEP, allow updating step text; ignore quantity/unit updates
                        if (request.StepText != null)
                            c.StepText = string.IsNullOrWhiteSpace(request.StepText) ? null : request.StepText.Trim();
                    }

                    c.UpdatedBy = updatedBy;
                    c.UpdatedAt = DateTime.UtcNow;
                },
                _logger);

            _logger.LogInformation("Updated recipe composition {ExternalId}", externalId);

            return MapToDto(composition, 
                composition.ParentRecipe!.ExternalId, 
                composition.ParentRecipe!.RecipeName, 
                composition.SubRecipe?.ExternalId, 
                composition.SubRecipe?.RecipeName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating recipe composition {ExternalId}", externalId);
            throw;
        }
    }

    public async Task DeleteCompositionAsync(Guid externalId, Guid organizationId, Guid deletedBy)
    {
        try
        {
            var composition = await _context.RecipeCompositions
                .FirstOrDefaultAsync(rc => rc.ExternalId == externalId 
                    && rc.OrganizationId == organizationId 
                    && !rc.IsDeleted);

            if (composition == null)
            {
                throw new InvalidOperationException($"Recipe composition with external ID {externalId} not found");
            }

            composition.IsDeleted = true;
            composition.UpdatedBy = deletedBy;
            composition.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Soft deleted recipe composition {ExternalId}", externalId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting recipe composition {ExternalId}", externalId);
            throw;
        }
    }

    private static RecipeCompositionDto MapToDto(RecipeComposition composition, Guid parentExternalId, string parentName, Guid? subExternalId, string? subName)
    {
        return new RecipeCompositionDto
        {
            ExternalId = composition.ExternalId,
            ParentRecipeExternalId = parentExternalId,
            ParentRecipeName = parentName,
            CompositionType = composition.CompositionType,
            SubRecipeExternalId = subExternalId,
            SubRecipeName = subName,
            Quantity = composition.Quantity,
            Unit = composition.Unit,
            StepText = composition.StepText,
            SectionName = composition.SectionName,
            SequenceNumber = composition.SequenceNumber
        };
    }

    /// <summary>
    /// Calculate the composition depth of a recipe (how many levels of sub-recipes it contains).
    /// Depth 0: Recipe with only ingredients, no sub-recipes.
    /// Depth 1: Recipe that has sub-recipes (each sub-recipe has only ingredients).
    /// Depth 2: Recipe with sub-recipes that themselves have sub-recipes.
    /// 
    /// Maximum allowed depth is 2, enforced at composition create/update time.
    /// </summary>
    /// <param name="recipeId">The numeric recipe ID to check</param>
    /// <param name="organizationId">Organization ID for scoping</param>
    /// <returns>The maximum depth level found (0 if no sub-recipes)</returns>
    private async Task<int> CalculateRecipeDepthAsync(long recipeId, Guid organizationId)
    {
        try
        {
            // Get all direct sub-recipes of this recipe
            var directSubRecipes = await _context.RecipeCompositions
                .AsNoTracking()
                .Where(rc => rc.ParentRecipeId == recipeId 
                    && rc.OrganizationId == organizationId 
                    && !rc.IsDeleted
                    && rc.CompositionType == "RECIPE"
                    && rc.SubRecipeId.HasValue)
                .Select(rc => rc.SubRecipeId!.Value)
                .ToListAsync();

            // If no sub-recipes, depth is 0
            if (!directSubRecipes.Any())
                return 0;

            // If has sub-recipes, check their depths recursively
            int maxSubDepth = 0;
            foreach (var subRecipeId in directSubRecipes)
            {
                int subDepth = await CalculateRecipeDepthAsync(subRecipeId, organizationId);
                maxSubDepth = Math.Max(maxSubDepth, subDepth);
            }

            // Return 1 + max depth of sub-recipes
            return 1 + maxSubDepth;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating recipe depth for recipe ID {RecipeId}", recipeId);
            throw;
        }
    }
}