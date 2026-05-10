using PreOrderApp.Models;
using PreOrderApp.Data;
using Microsoft.EntityFrameworkCore;
using PreOrderApp.DTOs;
using PreOrderApp.Infrastructure;

namespace PreOrderApp.Services;

public interface IRecipeService
{
    Task<RecipeDetailDto?> GetRecipeByExternalIdAsync(Guid externalId, Guid organizationId, int? version = null);
    Task<PaginatedResult<RecipeDetailDto>> GetRecipesAsync(Guid organizationId, int? pageNumber = null, int? pageSize = null, string? sortBy = null, string? sortDirection = null);
//    Task<RecipeDetailDto> CreateRecipeAsync(CreateRecipeRequest request, Guid organizationId, Guid createdBy, Boolean clearProductWhenNull);
    Task<RecipeDetailDto> CreateRecipeWithDetailsAsync(CreateRecipeWithDetailsRequest request, Guid organizationId, Guid createdBy);
    Task<RecipeDetailDto> CreateDraftRecipeWithDetailsAsync(Guid recipeExternalIdToClone, Guid organizationId, Guid createdBy);
    Task<RecipeDetailDto> CreateCloneRecipeWithDetailsAsync(Guid recipeExternalIdToClone, Guid organizationId, Guid createdBy);
    Task<RecipeDetailDto> UpdateRecipeWithDetailsAsync(UpdateRecipeWithDetailsRequest request, Guid organizationId, Guid createdBy);
    Task<RecipeDetailDto> UpdateRecipeAsync(Guid externalId, UpdateRecipeRequest request, Guid organizationId, Guid updatedBy, bool clearProductWhenNull = false);
    Task<RecipeDetailDto> UpdateRecipeCostAsync(Guid externalId, decimal? costPerUnit, Guid organizationId, Guid updatedBy);
    Task DeleteRecipeAsync(Guid externalId, Guid organizationId, Guid deletedBy);
    
    // Version management methods (TODO-1017 Phase 4)
    Task<List<RecipeVersionSummaryDto>> GetRecipeVersionsAsync(Guid recipeExternalId, Guid organizationId);
    Task<RecipeDetailDto> ActivateRecipeVersionAsync(Guid externalId, Guid organizationId, Guid activatedBy);
    Task<RecipeDetailDto> ArchiveRecipeVersionAsync(Guid externalId, Guid organizationId, Guid archivedBy);
    
    // RECIPE(7) FIX: Check if product is used by other recipes
    Task<ProductUsageCheckDto> CheckProductUsageByRecipesAsync(Guid productExternalId, Guid organizationId);
    
    // Note: Ingredient management moved to RecipeIngredientService (TODO-1020)
    // Note: Composition management moved to RecipeCompositionService (TODO-1020)
}

public class RecipeService : IRecipeService
{
    private readonly AppDbContext _context;
    private readonly ILogger<RecipeService> _logger;


    public RecipeService(AppDbContext context, ILogger<RecipeService> logger)
    {
        _context = context;
        _logger = logger;
    }

    // Helper: Create Recipe Steps
    private async Task CreateRecipeStepsAsync(long recipeId, List<RecipeStepInput> steps, Guid organizationId, Guid createdBy, bool clearProductWhenNull = true)
    {
        if (steps == null || steps.Count == 0) return;
        var utcTms = DateTime.UtcNow;
        var seqNbr = 1;
        foreach (var stepInput in steps)
        {
            var step = new RecipeStep
            {
                ExternalId = Guid.NewGuid(),
                OrganizationId = organizationId,
                RecipeDetailId = recipeId,
                StepInstructionText = stepInput.StepInstructionText,
                StepNumber = seqNbr,
                IsDeleted = false,
                CreatedBy = createdBy,
                CreatedAt = utcTms,
                UpdatedBy = createdBy,
                UpdatedAt = utcTms,
                VersionNbr = 1
            };
            _context.RecipeSteps.Add(step);
            seqNbr++;
        }
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Returns the max depth of a recipe's composition tree.
    /// Depth 0 = no sub-recipes. Depth 1 = has sub-recipes with no children. Depth 2 = max allowed.
    /// </summary>
    private async Task<int> CalculateRecipeDepthAsync(long recipeId, Guid organizationId)
    {
        var directSubRecipes = await _context.RecipeCompositions
            .AsNoTracking()
            .Where(rc => rc.ParentRecipeId == recipeId
                && rc.OrganizationId == organizationId
                && !rc.IsDeleted
                && rc.CompositionType == "RECIPE"
                && rc.SubRecipeId.HasValue)
            .Select(rc => rc.SubRecipeId!.Value)
            .ToListAsync();

        if (!directSubRecipes.Any())
            return 0;

        int maxSubDepth = 0;
        foreach (var subId in directSubRecipes)
        {
            int d = await CalculateRecipeDepthAsync(subId, organizationId);
            maxSubDepth = Math.Max(maxSubDepth, d);
        }
        return 1 + maxSubDepth;
    }

    //Check to determine if a DRAFT version exists based upon master RecipeId
    private async Task<bool> CheckDraftVersionExistsAsync(long? masterId, Guid organizationId)
    {
        bool exists = await _context.RecipeDetails
            .AsNoTracking()
            .AnyAsync(r => (r.MasterId ?? r.Id) == masterId
                && r.OrganizationId == organizationId
                && !r.IsDeleted
                && r.RecipeStatusCd == 'D');

        return exists;
    }

    // Find the latest version non deleted DRAFT of the master recipe by RecipeVersionNbr
    public async Task<RecipeDetailDto?> GetLastDraftVersionAsync(long masterId, Guid organizationId)
    {
        var draft = await _context.RecipeDetails
            .AsNoTracking()
            .Where(r => (r.MasterId ?? r.Id) == masterId
                && r.OrganizationId == organizationId
                && !r.IsDeleted
                && r.RecipeStatusCd == 'D')
            .OrderByDescending(r => r.RecipeVersionNbr)
            .FirstOrDefaultAsync();
        if (draft == null)
            return null;
        return await MapToDtoAsync(draft);
    }

    // Find the latest version of the master recipe by RecipeVersionNbr even if deleted
    private async Task<int> GetLastVersionNbrAsync(long? masterId, Guid organizationId)
    {

        if (masterId == null || !masterId.HasValue)
            return 1;

        // return the max value or 0
        var lastVersionNbr = await _context.RecipeDetails
            .AsNoTracking()
            .Where(r => (r.MasterId ?? r.Id) == masterId && r.OrganizationId == organizationId)
            .MaxAsync(r => (int?)r.RecipeVersionNbr) ?? 0;
        return lastVersionNbr;
    }

    /// <summary>
    /// Clones all nested entities (ingredients, compositions, steps) from a source recipe
    /// directly using internal IDs — no ExternalId round-trip required.
    /// Used by both CreateDraftRecipeWithDetailsAsync and CreateNewCloneRecipeWithDetailsAsync.
    /// </summary>
    private async Task CloneNestedEntitiesAsync(RecipeDetail source, long newRecipeId, Guid organizationId, Guid createdBy)
    {
        var utcTms = DateTime.UtcNow;

        // Clone ingredients — InventoryItemId is already an internal ID, copy directly
        if (source.Ingredients != null)
        {
            foreach (var src in source.Ingredients)
            {
                // Verify the inventory item still exists
                bool itemExists = await _context.InventoryItems
                    .AsNoTracking()
                    .AnyAsync(i => i.Id == src.InventoryItemId && i.OrganizationId == organizationId);

                if (!itemExists)
                {
                    _logger.LogWarning("Inventory item ID {ItemId} not found, skipping ingredient during clone", src.InventoryItemId);
                    continue;
                }

                _context.RecipeIngredients.Add(new RecipeIngredient
                {
                    ExternalId       = Guid.NewGuid(),
                    OrganizationId   = organizationId,
                    RecipeId         = newRecipeId,
                    InventoryItemId  = src.InventoryItemId,
                    QuantityRequired = src.QuantityRequired,
                    Unit             = src.Unit,
                    PurposeText      = src.PurposeText,
                    CostPerUnit      = src.CostPerUnit,
                    CreatedBy        = createdBy,
                    CreatedAt        = utcTms,
                    UpdatedBy        = createdBy,
                    UpdatedAt        = utcTms,
                    VersionNbr       = 1  // Always 1 for new records
                });
            }
            await _context.SaveChangesAsync();
        }

        // Clone compositions — SubRecipeId is already an internal ID, copy directly
        if (source.Composition != null)
        {
            foreach (var src in source.Composition.OrderBy(c => c.SequenceNumber))
            {
                // Verify sub-recipe still exists if referenced
                if (src.SubRecipeId.HasValue)
                {
                    bool subExists = await _context.RecipeDetails
                        .AsNoTracking()
                        .AnyAsync(r => r.Id == src.SubRecipeId.Value);

                    if (!subExists)
                    {
                        _logger.LogWarning("Sub-recipe ID {SubRecipeId} not found, skipping composition during clone", src.SubRecipeId);
                        continue;
                    }
                }

                _context.RecipeCompositions.Add(new RecipeComposition
                {
                    ExternalId      = Guid.NewGuid(),
                    OrganizationId  = organizationId,
                    ParentRecipeId  = newRecipeId,
                    SubRecipeId     = src.SubRecipeId,
                    CompositionType = src.CompositionType,
                    Quantity        = src.Quantity,
                    Unit            = src.Unit,
                    StepText        = src.StepText,
                    SectionName     = src.SectionName,
                    SequenceNumber  = src.SequenceNumber,
                    CreatedBy       = createdBy,
                    CreatedAt       = utcTms,
                    UpdatedBy       = createdBy,
                    UpdatedAt       = utcTms,
                    VersionNbr      = 1  // Always 1 for new records
                });
            }
            await _context.SaveChangesAsync();
        }

        // Clone steps — pure value copy, no ID resolution needed
        if (source.Steps != null)
        {
            var seqNbr = 1;
            foreach (var src in source.Steps.OrderBy(s => s.StepNumber))
            {
                _context.RecipeSteps.Add(new RecipeStep
                {
                    ExternalId          = Guid.NewGuid(),
                    OrganizationId      = organizationId,
                    RecipeDetailId      = newRecipeId,
                    StepInstructionText = src.StepInstructionText ?? string.Empty,
                    StepNumber          = seqNbr++,
                    IsDeleted           = false,
                    CreatedBy           = createdBy,
                    CreatedAt           = utcTms,
                    UpdatedBy           = createdBy,
                    UpdatedAt           = utcTms,
                    VersionNbr          = 1  // Always 1 for new records
                });
            }
            await _context.SaveChangesAsync();
        }
    }

    // Helper: Create Recipe Compositions
    private async Task CreateRecipeCompositionsAsync(long recipeId, List<RecipeCompositionInput> compositions, Guid organizationId, Guid createdBy)
    {
        if (compositions == null || compositions.Count == 0) return;
        var utcTms = DateTime.UtcNow;
        var seqNbr = 1;
        foreach (var compositionInput in compositions)
        {
            long? subRecipeId = null;
            if (compositionInput.CompositionType == "RECIPE" && compositionInput.SubRecipeExternalId.HasValue)
            {
                var subRecipe = await _context.RecipeDetails
                    .AsNoTracking()
                    .FirstOrDefaultAsync(r => r.ExternalId == compositionInput.SubRecipeExternalId.Value && r.OrganizationId == organizationId);
                if (subRecipe == null)
                {
                    _logger.LogWarning("Sub-recipe {SubRecipeId} not found, skipping composition", compositionInput.SubRecipeExternalId);
                    continue;
                }

                // Validate composition depth: reject if result would exceed depth 2
                var parentDepth = await CalculateRecipeDepthAsync(recipeId, organizationId);
                var subDepth = await CalculateRecipeDepthAsync(subRecipe.Id, organizationId);
                var resultingDepth = Math.Max(parentDepth, subDepth + 1);
                if (resultingDepth > 2)
                    throw new InvalidOperationException(
                        $"Cannot add sub-recipe '{subRecipe.RecipeName}': composition would reach depth {resultingDepth}. Maximum allowed depth is 2.");

                subRecipeId = subRecipe.Id;
            }
            var composition = new RecipeComposition
            {
                ExternalId = Guid.NewGuid(),
                OrganizationId = organizationId,
                ParentRecipeId = recipeId,
                SubRecipeId = subRecipeId,
                CompositionType = compositionInput.CompositionType,
                Quantity = compositionInput.Quantity,
                Unit = compositionInput.Unit,
                StepText = compositionInput.StepText,
                SectionName = compositionInput.SectionName,
                SequenceNumber = seqNbr,
                CreatedBy = createdBy,
                CreatedAt = utcTms,
                UpdatedBy = createdBy,
                UpdatedAt = utcTms,
                VersionNbr = 1
            };
            _context.RecipeCompositions.Add(composition);
            seqNbr++;
        }
        await _context.SaveChangesAsync();
    }

    // Helper: Create Recipe Ingredients
    private async Task CreateRecipeIngredientsAsync(long recipeId, List<RecipeIngredientInput> ingredients, Guid organizationId, Guid createdBy)
    {
        if (ingredients == null || ingredients.Count == 0) return;
        var utcTms = DateTime.UtcNow;
        foreach (var ingredientInput in ingredients)
        {
            bool hasInventory = ingredientInput.InventoryItemExternalId.HasValue;
            bool hasComponent = ingredientInput.RecipeComponentProductExternalId.HasValue;

            if (!hasInventory && !hasComponent)
            {
                throw new InvalidOperationException(
                    $"Ingredient source is required for recipe {recipeId}: either InventoryItemExternalId or RecipeComponentProductExternalId must be provided.");
            }

            if (hasInventory && hasComponent)
            {
                throw new InvalidOperationException(
                    $"Ingredient source is ambiguous for recipe {recipeId}: both InventoryItemExternalId ({ingredientInput.InventoryItemExternalId}) and RecipeComponentProductExternalId ({ingredientInput.RecipeComponentProductExternalId}) were provided.");
            }

            var ingredient = new RecipeIngredient
            {
                ExternalId = Guid.NewGuid(),
                OrganizationId = organizationId,
                RecipeId = recipeId,
                QuantityRequired = ingredientInput.QuantityRequired,
                Unit = ingredientInput.Unit,
                PurposeText = ingredientInput.PurposeTxt,
                CostPerUnit = ingredientInput.CostPerUnit ?? 0m,
                SequenceNumber = ingredientInput.SequenceNumber,
                CreatedBy = createdBy,
                CreatedAt = utcTms,
                UpdatedBy = createdBy,
                UpdatedAt = utcTms,
                VersionNbr = 1
            };

            if (hasInventory)
            {
                var inventoryItem = await _context.InventoryItems
                    .AsNoTracking()
                    .FirstOrDefaultAsync(i => i.ExternalId == ingredientInput.InventoryItemExternalId!.Value && i.OrganizationId == organizationId);
                if (inventoryItem == null)
                {
                    throw new InvalidOperationException(
                        $"Inventory item {ingredientInput.InventoryItemExternalId} not found for organization {organizationId}.");
                }

                ingredient.InventoryItemId = inventoryItem.Id;
            }
            else
            {
                var componentProduct = await _context.SellableProducts
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.ExternalId == ingredientInput.RecipeComponentProductExternalId!.Value && p.OrganizationId == organizationId);
                if (componentProduct == null)
                {
                    throw new InvalidOperationException(
                        $"Recipe component product {ingredientInput.RecipeComponentProductExternalId} not found for organization {organizationId}.");
                }

                ingredient.RecipeComponentProductId = componentProduct.Id;
            }

            _context.RecipeIngredients.Add(ingredient);
        }
        await _context.SaveChangesAsync();
    }
    public async Task<RecipeDetailDto?> GetRecipeByExternalIdAsync(Guid externalId, Guid organizationId, int? version = null)
    {
        try
        {
            var query = _context.RecipeDetails
                .Include(r => r.Steps.Where(s => !s.IsDeleted).OrderBy(s => s.StepNumber))
                .AsNoTracking()
                .Where(r => r.ExternalId == externalId && r.OrganizationId == organizationId && !r.IsDeleted);

            // If version is specified, fetch that specific version; otherwise prefer active then latest
            RecipeDetail? recipe;
            if (version.HasValue)
            {
                recipe = await query.FirstOrDefaultAsync(r => r.RecipeVersionNbr == version.Value);
            }
            else
            {
                recipe = await query.FirstOrDefaultAsync(r => r.RecipeStatusCd == 'A')
                    ?? await query.OrderByDescending(r => r.RecipeVersionNbr).FirstOrDefaultAsync();
            }

            if (recipe == null)
                return null;

            return await MapToDtoAsync(recipe);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recipe {ExternalId}", externalId);
            throw;
        }
    }

    public async Task<PaginatedResult<RecipeDetailDto>> GetRecipesAsync(
        Guid organizationId, 
        int? pageNumber = null, 
        int? pageSize = null, 
        string? sortBy = null, 
        string? sortDirection = null)
    {
        try
        {
            // Return one recipe per master, prioritizing:
            // 1) Active recipe (RecipeStatusCd = 'A')
            // 2) Latest Draft recipe (RecipeStatusCd = 'D') if no Active
            // 3) Latest version if no Active or Draft

            var safeSortBy = CleanString(sortBy);
            var safeDirection = CleanString(sortDirection ?? "asc");

            var allRecipes = await _context.RecipeDetails
                .AsNoTracking()
                .Where(r => r.OrganizationId == organizationId && !r.IsDeleted)
                .OrderByDescending(r => r.RecipeName)
                .ToListAsync();

            // Group by MasterId and select the best version for each master
            var selectedRecipes = allRecipes
                .GroupBy(r => r.MasterId)
                .Select(g =>
                {
                    // Priority 1: Active recipe
                    var active = g.FirstOrDefault(r => r.RecipeStatusCd == 'A');
                    if (active != null) return active;

                    // Priority 2: Latest Draft version
                    var draft = g.Where(r => r.RecipeStatusCd == 'D')
                        .OrderByDescending(r => r.RecipeVersionNbr)
                        .FirstOrDefault();
                    if (draft != null) return draft;

                    // Priority 3: Latest version regardless of status
                    return g.OrderByDescending(r => r.RecipeVersionNbr).First();
                })
                .ToList();

            // Apply sorting if specified
            if (!string.IsNullOrEmpty(safeSortBy))
            {
                var isDescending = safeDirection == "desc";
                selectedRecipes = safeSortBy switch
                {
                    "name" => isDescending 
                        ? selectedRecipes.OrderByDescending(r => r.RecipeName).ToList() 
                        : selectedRecipes.OrderBy(r => r.RecipeName).ToList(),
                    "description" => isDescending 
                        ? selectedRecipes.OrderByDescending(r => r.Description ?? string.Empty).ToList() 
                        : selectedRecipes.OrderBy(r => r.Description ?? string.Empty).ToList(),
                    "yieldquantity" => isDescending 
                        ? selectedRecipes.OrderByDescending(r => r.YieldServingCnt).ToList() 
                        : selectedRecipes.OrderBy(r => r.YieldServingCnt).ToList(),
                    "costperunit" => isDescending 
                        ? selectedRecipes.OrderByDescending(r => r.CostPerUnit).ToList() 
                        : selectedRecipes.OrderBy(r => r.CostPerUnit).ToList(),
                    "status" => isDescending 
                        ? selectedRecipes.OrderByDescending(r => GetStatusName(r.RecipeStatusCd.ToString())).ToList() 
                        : selectedRecipes.OrderBy(r => GetStatusName(r.RecipeStatusCd.ToString())).ToList(),
                    _ => selectedRecipes.OrderBy(r => r.RecipeName).ToList() // Default to name ascending
                };
                _logger.LogInformation("Sorted recipes by {SortBy} {Direction}", safeSortBy, safeDirection);
            }
            else
            {
                // Default sort by name ascending
                selectedRecipes = selectedRecipes.OrderBy(r => r.RecipeName).ToList();
            }

            // Calculate total count before pagination
            var totalCount = selectedRecipes.Count;
            
            // Early return if no recipes found
            if (totalCount == 0)
            {
                _logger.LogInformation("No recipes found for organization {OrgId}", organizationId);
                return new PaginatedResult<RecipeDetailDto>
                {
                    Data = new List<RecipeDetailDto>(),
                    TotalCount = 0,
                    PageNumber = pageNumber ?? 1,
                    PageSize = pageSize ?? 10
                };
            }

            // Determine pagination parameters
            var currentPage = pageNumber ?? 1;
            var currentPageSize = pageSize ?? totalCount; // Default to all records if no page size specified
            
            // Apply pagination if both parameters provided
            if (pageNumber.HasValue && pageSize.HasValue && pageSize.Value > 0)
            {
                var skip = (currentPage - 1) * currentPageSize;
                selectedRecipes = selectedRecipes.Skip(skip).Take(currentPageSize).ToList();
                _logger.LogInformation("Applying pagination: page {Page}, size {Size}, skip {Skip} for org {OrgId}", 
                    currentPage, currentPageSize, skip, organizationId);
            }
            else
            {
                _logger.LogInformation("No pagination applied, returning all {Count} recipes for org {OrgId}", 
                    totalCount, organizationId);
            }

            // Load related data for selected recipes, preserving order
            var recipeIds = selectedRecipes.Select(r => r.Id).ToList();
            var recipesWithStepsDict = await _context.RecipeDetails
                .Include(r => r.Steps.Where(s => !s.IsDeleted).OrderBy(s => s.StepNumber))
                .AsNoTracking()
                .Where(r => recipeIds.Contains(r.Id))
                .ToDictionaryAsync(r => r.Id);

            // Map to DTOs in the same order as selectedRecipes
            var recipeDtos = new List<RecipeDetailDto>();
            foreach (var selectedRecipe in selectedRecipes)
            {
                if (recipesWithStepsDict.TryGetValue(selectedRecipe.Id, out var recipeWithSteps))
                {
                    recipeDtos.Add(await MapToDtoAsync(recipeWithSteps));
                }
            }
            
            return new PaginatedResult<RecipeDetailDto>
            {
                Data = recipeDtos,
                TotalCount = totalCount,
                PageNumber = currentPage,
                PageSize = currentPageSize
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recipes for organization {OrgId}", organizationId);
            throw;
        }
    }


    private static string CleanString(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return "empty";

        // Normalize
        var trimmed = value.Trim().ToLowerInvariant();

        // Remove dangerous characters (newlines, tabs, control chars)
        trimmed = trimmed
            .Replace("\r", "")
            .Replace("\n", "")
            .Replace("\t", "");

        // Keep only safe characters
        trimmed = string.Concat(trimmed.Where(c =>
            char.IsLetterOrDigit(c) || c == '-' || c == '_'));

        if (trimmed.Length == 0)
            return "invalid";

        // Limit length to avoid log flooding
        return trimmed.Length > 40 ? trimmed[..40] + "..." : trimmed;
    }
    /// <summary>
    /// Helper method to map status code to display name for sorting
    /// </summary>
    private static string GetStatusName(string statusCode)
    {
        return statusCode switch
        {
            "D" => "Draft",
            "A" => "Active",
            "X" => "Archived",
            "B" => "Abandoned",
            _ => statusCode // Return the code itself if unknown
        };
    }

    public async Task<RecipeDetailDto> CreateRecipeWithDetailsAsync(CreateRecipeWithDetailsRequest request, Guid organizationId, Guid createdBy)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            int newVersionNbr = 1;
            long? masterId = null;
            // Step 0: Check if a draft version already exists and stop processing if it does

            if (request.MasterRecipeExternalId.HasValue && request.MasterRecipeExternalId.Value != Guid.Empty)
            {
                var masterRecipe = await _context.RecipeDetails
                    .AsNoTracking()
                    .FirstOrDefaultAsync(r => r.ExternalId == request.MasterRecipeExternalId.Value
                        && r.OrganizationId == organizationId
                        && !r.IsDeleted);

                if (masterRecipe == null)
                    throw new InvalidOperationException($"Master recipe with ID {request.MasterRecipeExternalId} not found");

                masterId = masterRecipe.Id;

                bool draftExists = await CheckDraftVersionExistsAsync(masterId, organizationId);
                if (draftExists)
                    throw new InvalidOperationException($"Master recipe ID {request.MasterRecipeExternalId} already has a draft version.");

                newVersionNbr = await GetLastVersionNbrAsync(masterId, organizationId) + 1;

            }

            // Step 1: Validate product exists (if provided)
            long? productId = null;
            
            if (string.IsNullOrWhiteSpace(request.ProductExternalId.ToString()))
            {
                request.ProductExternalId = null;
            }
            if (request.ProductExternalId.HasValue && request.ProductExternalId.Value != Guid.Empty)
            {
                var product = await _context.SellableProducts
                    .FirstOrDefaultAsync(p => p.ExternalId == request.ProductExternalId.Value && p.OrganizationId == organizationId);

                if (product == null)
                    throw new InvalidOperationException($"Product with ID {request.ProductExternalId} not found");
                
                productId = product.Id;
                Console.WriteLine($">>> SERVICE: Found product with numeric ID: {productId}");
            }
            else
            {
                Console.WriteLine($">>> SERVICE: No product specified (null or empty GUID), using productId=null");
            }


            var utcTms = DateTime.UtcNow;

            // Step 2: Create master recipe
            var recipe = new RecipeDetail
            {
                ExternalId = Guid.NewGuid(),
                OrganizationId = organizationId,
                ProductId = productId, // null if no product linked (optional)
                RecipeName = request.RecipeName,
                Description = request.Description,
                YieldServingCnt = request.YieldServingCnt,
                YieldUnit = request.YieldUnit ?? "pieces",
                UnitsPerServing = request.UnitsPerServing,
                CostPerUnit = request.CostPerUnit ?? 0,

                // Timing metadata
                PrepTimeMin = request.PrepTimeMin,
                ActiveTimeMin = request.ActiveTimeMin,
                CookTimeMin = request.CookTimeMin,
                RestTimeMin = request.RestTimeMin,
                InactiveTimeMin = request.InactiveTimeMin,
                TotalTimeMin = request.TotalTimeMin,
                ShelfLifeDayCnt = request.ShelfLifeDayCnt,
                // Versioning fields
                RecipeVersionNbr = newVersionNbr,
                RecipeStatusCd = request.RecipeStatusCd ?? 'D',
                StartDt = request.StartDt,
                EndDt = null,
                ApprovedBy = null,
                ApprovedAt = null,
                CreatedBy = createdBy,
                CreatedAt = utcTms,
                UpdatedBy = createdBy,
                UpdatedAt = utcTms,
                VersionNbr = 1
            };

            // If this is the initial version (no masterId), set MasterId to self
            if (!masterId.HasValue)
            {
                // recipe.Id is not available until after SaveChanges, so set MasterId after add
                _context.RecipeDetails.Add(recipe);
                await _context.SaveChangesAsync();
                recipe.MasterId = recipe.Id;
                await _context.SaveChangesAsync();
            }
            else
            {
                recipe.MasterId = masterId;
                _context.RecipeDetails.Add(recipe);
                await _context.SaveChangesAsync();
            }
            
            // Step 3: Create ingredients (if any)
            if (request.Ingredients.Count > 0)
            {   
                await CreateRecipeIngredientsAsync(recipe.Id, request.Ingredients, organizationId, createdBy);
            }

            // Step 4: Create compositions (if any)
            if (request.Compositions.Count > 0)
            {
                await CreateRecipeCompositionsAsync(recipe.Id, request.Compositions, organizationId, createdBy);
            }

            // Step 5: Create steps (if any)
            if (request.Steps.Count > 0)
            {
                await CreateRecipeStepsAsync(recipe.Id, request.Steps, organizationId, createdBy);
            }

            // Commit transaction
            await transaction.CommitAsync();
            

            _logger.LogInformation("Recipe {ExternalId} created with {IngredientCount} ingredients, "
                    + " {CompositionCount} compositions, and {StepCount} steps", 
                recipe.ExternalId, request.Ingredients.Count, request.Compositions.Count, request.Steps.Count);

            // Return the complete recipe DTO
            return await MapToDtoAsync(recipe);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            Console.WriteLine($">>> SERVICE: Transaction ROLLED BACK due to error: {ex.Message}");
            _logger.LogError(ex, "Error creating recipe with details, transaction rolled back");
            throw;
        }
    }

    /// <summary>
    /// Creates a draft version of an existing recipe by cloning from database
    /// Simplified signature - only requires the recipe to clone
    /// All nested entities (ingredients, compositions, steps) are cloned automatically
    /// </summary>
    public async Task<RecipeDetailDto> CreateDraftRecipeWithDetailsAsync(
        Guid recipeExternalIdToClone, 
        Guid organizationId, 
        Guid createdBy)
    {
    using var transaction = await _context.Database.BeginTransactionAsync();
    try
    {
        // Step 1: Fetch the source recipe to clone (with all nested entities)
        var sourceRecipe = await _context.RecipeDetails
            .Include(r => r.Ingredients)
            .Include(r => r.Composition)
            .Include(r => r.Steps)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.ExternalId == recipeExternalIdToClone 
                && r.OrganizationId == organizationId 
                && !r.IsDeleted);

        if (sourceRecipe == null)
            throw new InvalidOperationException($"Source recipe with ID {recipeExternalIdToClone} not found");

        // Step 2: Determine master recipe ID
        long masterId = sourceRecipe.MasterId ?? sourceRecipe.Id;

        // Step 3: Check if a draft version already exists (EXISTING VALIDATION - PRESERVED)
        bool draftExists = await CheckDraftVersionExistsAsync(masterId, organizationId);
        if (draftExists)
            throw new InvalidOperationException($"Recipe ID {recipeExternalIdToClone} already has a draft version.");

        // Step 4: Get next version number (EXISTING LOGIC - PRESERVED)
        int newVersionNbr = await GetLastVersionNbrAsync(masterId, organizationId) + 1;

        // Step 5: Validate product exists if source recipe has product linked (EXISTING VALIDATION - PRESERVED)
        long? productId = sourceRecipe.ProductId;
        if (productId.HasValue)
        {
            var product = await _context.SellableProducts
                .FirstOrDefaultAsync(p => p.Id == productId.Value && p.OrganizationId == organizationId);

            if (product == null)
            {
                // Product was deleted since source recipe was created - set to null
                _logger.LogWarning("Product ID {ProductId} not found, creating draft without product link", productId);
                productId = null;
            }
        }

        var utcTms = DateTime.UtcNow;

        // Step 6: Create draft recipe by cloning from source
        var draftRecipe = new RecipeDetail
        {
            ExternalId = Guid.NewGuid(), // New external ID for draft version
            OrganizationId = organizationId,
            ProductId = productId,
            MasterId = masterId, // Link to master recipe
            
            // Clone all properties from source recipe
            RecipeName = sourceRecipe.RecipeName,
            Description = sourceRecipe.Description,
            YieldServingCnt = sourceRecipe.YieldServingCnt,
            YieldUnit = sourceRecipe.YieldUnit,
            CostPerUnit = sourceRecipe.CostPerUnit,
            ShelfLifeDayCnt = sourceRecipe.ShelfLifeDayCnt,

            // Clone timing metadata
            PrepTimeMin = sourceRecipe.PrepTimeMin,
            ActiveTimeMin = sourceRecipe.ActiveTimeMin,
            CookTimeMin = sourceRecipe.CookTimeMin,
            RestTimeMin = sourceRecipe.RestTimeMin,
            InactiveTimeMin = sourceRecipe.InactiveTimeMin,
            TotalTimeMin = sourceRecipe.TotalTimeMin,
            
            // Versioning fields - new draft version
            RecipeVersionNbr = newVersionNbr,
            RecipeStatusCd = 'D', // Always draft
            StartDt = null, // Not started yet
            EndDt = null,
            ApprovedBy = null,
            ApprovedAt = null,
            
            // Audit fields
            CreatedBy = createdBy,
            CreatedAt = utcTms,
            UpdatedBy = createdBy,
            UpdatedAt = utcTms,
            VersionNbr = 1
        };

        _context.RecipeDetails.Add(draftRecipe);
        await _context.SaveChangesAsync();

        // Step 7: Clone all nested entities directly (no ExternalId round-trip)
        await CloneNestedEntitiesAsync(sourceRecipe, draftRecipe.Id, organizationId, createdBy);

        // Commit transaction
        await transaction.CommitAsync();

        _logger.LogInformation(
            "Draft recipe {DraftExternalId} created from source {SourceExternalId} with {IngredientCount} ingredients, {CompositionCount} compositions, and {StepCount} steps",
            draftRecipe.ExternalId,
            recipeExternalIdToClone,
            sourceRecipe.Ingredients?.Count ?? 0,
            sourceRecipe.Composition?.Count ?? 0,
            sourceRecipe.Steps?.Count ?? 0
        );

        // Return the complete recipe DTO
        return await MapToDtoAsync(draftRecipe);
    }
    catch (Exception ex)
    {
        await transaction.RollbackAsync();
        _logger.LogError(ex, "Error creating draft recipe from source {SourceId}, transaction rolled back", recipeExternalIdToClone);
        throw;
    }
}


    /// <summary>
    /// Forks an existing recipe into a completely independent new recipe (its own master, version 1, draft status).
    /// Unlike CreateDraftRecipeWithDetailsAsync (which adds a new version to the same recipe family),
    /// this breaks the lineage entirely — the clone becomes its own master recipe at version 1.
    /// </summary>
    public async Task<RecipeDetailDto> CreateCloneRecipeWithDetailsAsync(
        Guid recipeExternalIdToClone,
        Guid organizationId,
        Guid createdBy)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Step 1: Fetch source recipe with all nested entities
            var sourceRecipe = await _context.RecipeDetails
                .Include(r => r.Ingredients)
                .Include(r => r.Composition)
                .Include(r => r.Steps)
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.ExternalId == recipeExternalIdToClone
                    && r.OrganizationId == organizationId
                    && !r.IsDeleted);

            if (sourceRecipe == null)
                throw new InvalidOperationException($"Source recipe with ID {recipeExternalIdToClone} not found");

            // Step 2: Verify product still exists (keep link if it does, drop if deleted)
            long? productId = sourceRecipe.ProductId;
            if (productId.HasValue)
            {
                bool productExists = await _context.SellableProducts
                    .AsNoTracking()
                    .AnyAsync(p => p.Id == productId.Value && p.OrganizationId == organizationId);

                if (!productExists)
                {
                    _logger.LogWarning("Product ID {ProductId} not found, forking without product link", productId);
                    productId = null;
                }
            }

            var utcTms = DateTime.UtcNow;

            // Step 3: Create the forked recipe header — MasterId starts null, self-assigned after save
            var trimmed = sourceRecipe.RecipeName.TrimStart();
                var localRecipeName = trimmed.Length > 245 
                    ? trimmed.Substring(0, 245) + " (New)"
                    : trimmed + " (New)";

            var forkedRecipe = new RecipeDetail
            {
                ExternalId      = Guid.NewGuid(),
                OrganizationId  = organizationId,
                ProductId       = productId,
                MasterId        = null, // Will be set to self after save → new independent family
                RecipeName      = localRecipeName,
                Description     = sourceRecipe.Description,
                YieldServingCnt   = sourceRecipe.YieldServingCnt,
                YieldUnit       = sourceRecipe.YieldUnit,
                ShelfLifeDayCnt = sourceRecipe.ShelfLifeDayCnt,
                UnitsPerServing  = sourceRecipe.UnitsPerServing,
                CostPerUnit     = sourceRecipe.CostPerUnit,
                PrepTimeMin     = sourceRecipe.PrepTimeMin,
                ActiveTimeMin   = sourceRecipe.ActiveTimeMin,
                CookTimeMin     = sourceRecipe.CookTimeMin,
                RestTimeMin     = sourceRecipe.RestTimeMin,
                InactiveTimeMin = sourceRecipe.InactiveTimeMin,
                TotalTimeMin    = sourceRecipe.TotalTimeMin,
                RecipeVersionNbr = 1,   // Fork always starts at version 1
                RecipeStatusCd  = 'D',  // Always draft
                StartDt         = null,
                EndDt           = null,
                ApprovedBy      = null,
                ApprovedAt      = null,
                CreatedBy       = createdBy,
                CreatedAt       = utcTms,
                UpdatedBy       = createdBy,
                UpdatedAt       = utcTms,
                VersionNbr      = 1
            };

            _context.RecipeDetails.Add(forkedRecipe);
            await _context.SaveChangesAsync();

            // Self-assign MasterId now that we have the DB-generated Id
            forkedRecipe.MasterId = forkedRecipe.Id;
            await _context.SaveChangesAsync();

            // Step 4: Clone all nested entities directly (no ExternalId round-trip)
            await CloneNestedEntitiesAsync(sourceRecipe, forkedRecipe.Id, organizationId, createdBy);

            await transaction.CommitAsync();

            _logger.LogInformation(
                "Forked recipe {SourceExternalId} → new recipe {ForkedExternalId} (version 1, draft)",
                recipeExternalIdToClone, forkedRecipe.ExternalId);

            return await MapToDtoAsync(forkedRecipe);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Error forking recipe {SourceId}, transaction rolled back", recipeExternalIdToClone);
            throw;
        }
    }


    /// <summary>
    /// Update a recipe with all nested steps, ingredients, and compositions in a single database transaction
    /// Provides atomicity and better performance compared to multiple API calls
    /// Will be deleting all nested entities and then recreating them as it is more straight forward that performing differences.
    /// </summary>
    public async Task<RecipeDetailDto> UpdateRecipeWithDetailsAsync(UpdateRecipeWithDetailsRequest request, Guid organizationId, Guid createdBy)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {

            // Confirm that the MasterRecipe version is the last DRAFT (there could be deleted records)

            // Find recipe and get identifiers
            var recipe = await _context.RecipeDetails
                .FirstOrDefaultAsync(r => r.ExternalId == request.ExternalId && r.OrganizationId == organizationId);

            if (recipe == null)
                throw new InvalidOperationException($"Recipe {request.ExternalId} not found");
            
            var recipeId = recipe.Id;
            long? masterId = recipe.MasterId;
            int? myVersionNbr = recipe.RecipeVersionNbr;
            // Step 1: Only draft versions can be updated.  Check to make sure this is a draft version.
            if (!masterId.HasValue)
                throw new InvalidOperationException("Recipe.MasterId is required but was null");

            // Updates occur on master recipe versions.  If no version # exists then can't update recipe.
            if (myVersionNbr == null || myVersionNbr <= 0)
            {
                throw new InvalidOperationException($"Recipe version number is missing");
            }

            var curDraftVersion = await GetLastDraftVersionAsync(masterId.Value, organizationId);

            if (curDraftVersion is null)
            {
                throw new InvalidOperationException("Create a draft to edit the recipe.");
            }

            // if current draft version number (database) != my version number from the request 
            //      then we can't update as versions are different
            int curDraftVersionNbr = curDraftVersion.RecipeVersionNbr;
            
            if (curDraftVersionNbr != myVersionNbr)
            {
                throw new InvalidOperationException("Only the latest draft version can be updated.  Create a draft if it does not exist.");
            }
            // Activate this version as it is the latest and the status is being saved as Active.
            Console.WriteLine($">>> SERVICE: Activating recipe version {recipe.RecipeVersionNbr} for recipe {recipe.ExternalId} with status {request.RecipeStatusCd}");
            if (request.RecipeStatusCd == 'A')
            {
                Console.WriteLine($">>> SERVICE: Activating recipe version {recipe.RecipeVersionNbr} for recipe {recipe.ExternalId}");
                await ActivateRecipeVersionAsync(recipe.ExternalId, organizationId, createdBy);
            }
            // Step 2: Delete all steps, compositions, and ingredients previously associated
            var steps = _context.RecipeSteps.Where(s => s.RecipeDetailId == recipeId);
            _context.RecipeSteps.RemoveRange(steps);

            var compositions = _context.RecipeCompositions.Where(c => c.ParentRecipeId == recipeId);
            _context.RecipeCompositions.RemoveRange(compositions);

            var ingredients = _context.RecipeIngredients.Where(i => i.RecipeId == recipeId);
            _context.RecipeIngredients.RemoveRange(ingredients);

            await _context.SaveChangesAsync();


            // Step 3: Validate product exists (if provided)
            long? productId = null;
            
            if (string.IsNullOrWhiteSpace(request.ProductExternalId.ToString()))
            {
                request.ProductExternalId = null;
            }
            if (request.ProductExternalId.HasValue && request.ProductExternalId.Value != Guid.Empty)
            {
                var product = await _context.SellableProducts
                    .FirstOrDefaultAsync(p => p.ExternalId == request.ProductExternalId.Value && p.OrganizationId == organizationId);

                if (product == null)
                    throw new InvalidOperationException($"Product with ID {request.ProductExternalId} not found");
                
                productId = product.Id;
            }

            // Step 4: Update Top level Recipe Details
            var utcTms = DateTime.UtcNow;
            var updateRecipeRequest = new UpdateRecipeRequest
            {
                // Pass ProductExternalId through. For with-details updates, null is treated as explicit unlink.
                ProductExternalId = request.ProductExternalId,
                RecipeName = request.RecipeName,
                Description = request.Description,
                YieldServingCnt = request.YieldServingCnt,
                YieldUnit = request.YieldUnit,
                UnitsPerServing = request.UnitsPerServing,
                CostPerUnit = request.CostPerUnit,
                PrepTimeMin = request.PrepTimeMin,
                ActiveTimeMin = request.ActiveTimeMin,
                CookTimeMin = request.CookTimeMin,
                RestTimeMin = request.RestTimeMin,
                InactiveTimeMin = request.InactiveTimeMin,
                TotalTimeMin = request.TotalTimeMin,
                ShelfLifeDayCnt = request.ShelfLifeDayCnt,
                RecipeStatusCd = request.RecipeStatusCd,

                // ...add other top-level fields as needed
            };
                        
            await UpdateRecipeAsync(request.ExternalId, updateRecipeRequest, organizationId, createdBy, clearProductWhenNull: true);

            // Step 5: Create ingredients (if any)
            if (request.Ingredients.Count > 0)
            {   
                await CreateRecipeIngredientsAsync(recipe.Id, request.Ingredients, organizationId, createdBy);
            }

            // Step 6: Create compositions (if any)
            if (request.Compositions.Count > 0)
            {
                await CreateRecipeCompositionsAsync(recipe.Id, request.Compositions, organizationId, createdBy);
            }

            // Step 7: Create steps (if any)
            if (request.Steps.Count > 0)
            {
                await CreateRecipeStepsAsync(recipe.Id, request.Steps, organizationId, createdBy);
            }

            
            // Commit transaction
            await transaction.CommitAsync();
            

            _logger.LogInformation("Recipe {ExternalId} updated with {IngredientCount} ingredients and {CompositionCount} compositions", 
                recipe.ExternalId, request.Ingredients.Count, request.Compositions.Count);

            // Return the complete recipe DTO
            return await MapToDtoAsync(recipe);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Error updating recipe with details, transaction rolled back");
            throw;
        }
    }

    public async Task<RecipeDetailDto> UpdateRecipeCostAsync(Guid externalId, decimal? costPerUnit, Guid organizationId, Guid updatedBy)
    {
        var recipe = await _context.RecipeDetails.FirstOrDefaultAsync(r => r.ExternalId == externalId && r.OrganizationId == organizationId);
        if (recipe == null)
            throw new InvalidOperationException($"Recipe {externalId} not found");

        // update only cost fields to avoid touching nested entities
        recipe.CostPerUnit = costPerUnit;
        recipe.UpdatedAt = DateTime.UtcNow;
        recipe.UpdatedBy = updatedBy;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated recipe {ExternalId} costPerUnit to {Cost}", externalId, costPerUnit);
        return await MapToDtoAsync(recipe);
    }

    public async Task<RecipeDetailDto> UpdateRecipeAsync(Guid externalId, UpdateRecipeRequest request, Guid organizationId, Guid updatedBy, bool clearProductWhenNull = false)
    {
        try
        {
            var recipe = await _context.RecipeDetails
                .FirstOrDefaultAsync(r => r.ExternalId == externalId && r.OrganizationId == organizationId);

            if (recipe == null)
                throw new InvalidOperationException($"Recipe {externalId} not found");

            // Resolve ProductExternalId → ProductId before the version-check lambda (async not allowed inside)
            long? resolvedProductId = recipe.ProductId;
            if (request.ProductExternalId.HasValue && request.ProductExternalId.Value != Guid.Empty)
            {
                var product = await _context.SellableProducts
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.ExternalId == request.ProductExternalId.Value && p.OrganizationId == organizationId);
                if (product == null)
                    throw new InvalidOperationException($"Product {request.ProductExternalId} not found");
                resolvedProductId = product.Id;
            }
            else if (request.ProductExternalId == Guid.Empty || (clearProductWhenNull && request.ProductExternalId is null))
            {
                resolvedProductId = null; // explicit unlink
            }

            // Use reusable optimistic locking extension
            await _context.UpdateWithVersionCheckAsync<Models.RecipeDetail>(
                recipe,
                request.VersionNbr,
                "Recipe",
                recipe.RecipeName,
                r =>
                {
                    // Basic fields
                    r.RecipeName = request.RecipeName ?? r.RecipeName;
                    r.Description = request.Description ?? r.Description;
                    r.YieldServingCnt = request.YieldServingCnt ?? r.YieldServingCnt;
                    r.YieldUnit = request.YieldUnit ?? r.YieldUnit;
                    r.CostPerUnit = request.CostPerUnit ?? r.CostPerUnit;
                    r.UnitsPerServing = request.UnitsPerServing;
                    r.ShelfLifeDayCnt = request.ShelfLifeDayCnt;
                    // Product link
                    if (request.ProductExternalId.HasValue || (clearProductWhenNull && request.ProductExternalId is null))
                    {
                        r.ProductId = resolvedProductId;
                    }
                    
                    // Timing metadata (TODO-1017)
                    if (request.PrepTimeMin.HasValue) r.PrepTimeMin = request.PrepTimeMin;
                    if (request.ActiveTimeMin.HasValue) r.ActiveTimeMin = request.ActiveTimeMin;
                    if (request.CookTimeMin.HasValue) r.CookTimeMin = request.CookTimeMin;
                    if (request.RestTimeMin.HasValue) r.RestTimeMin = request.RestTimeMin;
                    if (request.InactiveTimeMin.HasValue) r.InactiveTimeMin = request.InactiveTimeMin;
                    if (request.TotalTimeMin.HasValue) r.TotalTimeMin = request.TotalTimeMin;
                    
                    // Status transition validation (TODO-1017)
                    if (request.RecipeStatusCd.HasValue && request.RecipeStatusCd.Value != r.RecipeStatusCd)
                    {
                        ValidateStatusTransition(r.RecipeStatusCd, request.RecipeStatusCd.Value);
                        r.RecipeStatusCd = request.RecipeStatusCd.Value;
                        
                        // Set timestamps based on status
                        if (request.RecipeStatusCd.Value == 'A' && r.StartDt == null)
                            r.StartDt = DateTime.UtcNow; // Activate recipe
                        else if (request.RecipeStatusCd.Value == 'X' && r.EndDt == null)
                            r.EndDt = DateTime.UtcNow; // Archive recipe
                    }
                    
                    r.UpdatedBy = updatedBy;
                    r.UpdatedAt = DateTime.UtcNow;
                },
                _logger);

            return await MapToDtoAsync(recipe);
        }
        catch (InvalidOperationException)
        {
            throw; // Re-throw validation and concurrency exceptions
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating recipe {ExternalId}", externalId);
            throw;
        }
    }

    public async Task DeleteRecipeAsync(Guid externalId, Guid organizationId, Guid deletedBy)
    {
        try
        {
            var recipe = await _context.RecipeDetails
                .FirstOrDefaultAsync(r => r.ExternalId == externalId && r.OrganizationId == organizationId);

            if (recipe == null)
                throw new InvalidOperationException($"Recipe {externalId} not found");

//            _context.RecipeDetails.Remove(recipe);
            recipe.EndDt = DateTime.UtcNow;
            recipe.IsDeleted = true;
            recipe.RecipeStatusCd = 'B';
            recipe.UpdatedBy = deletedBy;
            recipe.UpdatedAt = DateTime.UtcNow;
            recipe.VersionNbr++;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Recipe {ExternalId} deleted", externalId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting recipe {ExternalId}", externalId);
            throw;
        }
    }

    /// <summary>
    /// RECIPE(7) FIX: Check if a product is used as a finished good by any recipes.
    /// Used when removing/changing product from recipe editor to warn if it's the last one.
    /// </summary>
    public async Task<ProductUsageCheckDto> CheckProductUsageByRecipesAsync(Guid productExternalId, Guid organizationId)
    {
        try
        {
            // Find the product's numeric ID
            var product = await _context.SellableProducts
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.ExternalId == productExternalId && p.OrganizationId == organizationId);

            if (product == null)
            {
                _logger.LogWarning("Product {ProductExternalId} not found for organization {OrgId}", productExternalId, organizationId);
                return new ProductUsageCheckDto { TotalRecipeCount = 0, ActiveRecipeCount = 0 };
            }

            // Find all recipes using this product as their finished good
            var recipes = await _context.RecipeDetails
                .AsNoTracking()
                .Where(r => r.ProductId == product.Id && r.OrganizationId == organizationId && !r.IsDeleted)
                .Select(r => new RecipeUsageSummary
                {
                    ExternalId = r.ExternalId,
                    RecipeName = r.RecipeName,
                    RecipeStatusCd = r.RecipeStatusCd,
                    RecipeVersionNbr = r.RecipeVersionNbr
                })
                .ToListAsync();

            var result = new ProductUsageCheckDto
            {
                TotalRecipeCount = recipes.Count,
                ActiveRecipeCount = recipes.Count(r => r.RecipeStatusCd == 'A'),
                Recipes = recipes
            };

            _logger.LogInformation(
                "Product {ProductExternalId} is used by {RecipeCount} recipes ({ActiveCount} active)",
                productExternalId, result.TotalRecipeCount, result.ActiveRecipeCount);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking product usage for {ProductExternalId}", productExternalId);
            throw;
        }
    }

    /// <summary>
    /// Get all versions of a recipe by recipe name and organization (TODO-1017 Phase 4)
    /// Returns versions in descending order (newest first)
    /// </summary>
    public async Task<List<RecipeVersionSummaryDto>> GetRecipeVersionsAsync(Guid recipeExternalId, Guid organizationId)
    {
        try
        {
            // Get the original recipe by external ID
            var originalRecipe = await _context.RecipeDetails
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.ExternalId == recipeExternalId && r.OrganizationId == organizationId && !r.IsDeleted);

            if (originalRecipe == null)
                throw new InvalidOperationException($"Recipe {recipeExternalId} not found");

            var masterId = originalRecipe.MasterId ?? originalRecipe.Id;
            var masterExternalId = originalRecipe.MasterId.HasValue && originalRecipe.MasterId.Value != originalRecipe.Id
                ? await _context.RecipeDetails
                    .AsNoTracking()
                    .Where(r => r.Id == masterId)
                    .Select(r => r.ExternalId)
                    .FirstOrDefaultAsync()
                : originalRecipe.ExternalId;

            // Get all versions by master_id
            var versions = await _context.RecipeDetails
                .AsNoTracking()
                .Where(r => (r.MasterId ?? r.Id) == masterId
                    && r.OrganizationId == organizationId 
                    && !r.IsDeleted)
                .OrderByDescending(r => r.RecipeVersionNbr)
                .Select(r => new RecipeVersionSummaryDto
                {
                    ExternalId = r.ExternalId,
                    MasterRecipeExternalId = masterExternalId,
                    RecipeName = r.RecipeName,
                    VersionNumber = r.RecipeVersionNbr,
                    Status = r.RecipeStatusCd.ToString(),
                    CreatedAt = r.CreatedAt,
                    CreatedBy = r.CreatedBy,
                    StartDt = r.StartDt,
                    EndDt = r.EndDt,
                    ApprovedBy = r.ApprovedBy,
                    ApprovedAt = r.ApprovedAt,
                    YieldServingCnt = r.YieldServingCnt,
                    YieldUnit = r.YieldUnit,
                    CostPerUnit = r.CostPerUnit
                })
                .ToListAsync();

            return versions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recipe versions for {ExternalId}", recipeExternalId);
            throw;
        }
    }

    /// <summary>
    /// Activate a recipe version (sets to active status) (TODO-1017 Phase 4)
    /// Deactivates any other active versions of the same recipe
    /// </summary>
    public async Task<RecipeDetailDto> ActivateRecipeVersionAsync(Guid externalId, Guid organizationId, Guid activatedBy)
    {
        try
        {
            var recipe = await _context.RecipeDetails
                .FirstOrDefaultAsync(r => r.ExternalId == externalId && r.OrganizationId == organizationId);

            if (recipe == null)
                throw new InvalidOperationException($"Recipe {externalId} not found");

            // Validate status transition
            ValidateStatusTransition(recipe.RecipeStatusCd, 'A');

            var masterId = recipe.MasterId ?? recipe.Id;

            // Deactivate other active versions of the same master recipe
            var otherActiveVersions = await _context.RecipeDetails
                .Where(r => (r.MasterId ?? r.Id) == masterId
                    && r.OrganizationId == organizationId
                    && r.RecipeStatusCd == 'A'
                    && r.Id != recipe.Id)
                .ToListAsync();

            foreach (var oldVersion in otherActiveVersions)
            {
                oldVersion.RecipeStatusCd = 'X'; // Archive old active version
                oldVersion.EndDt = DateTime.UtcNow;
                oldVersion.UpdatedBy = activatedBy;
                oldVersion.UpdatedAt = DateTime.UtcNow;
                _logger.LogInformation("Recipe version {ExternalId} archived as newer version activated", oldVersion.ExternalId);
            }

            // Activate the new version
            recipe.RecipeStatusCd = 'A';
            recipe.StartDt = DateTime.UtcNow;
            recipe.UpdatedBy = activatedBy;
            recipe.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Recipe version {ExternalId} activated", externalId);
            return await MapToDtoAsync(recipe);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error activating recipe version {ExternalId}", externalId);
            throw;
        }
    }

    /// <summary>
    /// Archive a recipe version (sets to archived status) (TODO-1017 Phase 4)
    /// Archived is a terminal state - recipe can no longer be modified
    /// </summary>
    public async Task<RecipeDetailDto> ArchiveRecipeVersionAsync(Guid externalId, Guid organizationId, Guid archivedBy)
    {
        try
        {
            var recipe = await _context.RecipeDetails
                .FirstOrDefaultAsync(r => r.ExternalId == externalId && r.OrganizationId == organizationId);

            if (recipe == null)
                throw new InvalidOperationException($"Recipe {externalId} not found");

            // Validate status transition
            ValidateStatusTransition(recipe.RecipeStatusCd, 'X');

            // Archive the version
            recipe.RecipeStatusCd = 'X';
            recipe.EndDt = DateTime.UtcNow;
            recipe.UpdatedBy = archivedBy;
            recipe.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Recipe version {ExternalId} archived", externalId);
            return await MapToDtoAsync(recipe);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error archiving recipe version {ExternalId}", externalId);
            throw;
        }
    }

    // Note: Ingredient management methods moved to RecipeIngredientService (TODO-1020)
    // Note: Composition management methods moved to RecipeCompositionService (TODO-1020)

    /// <summary>
    /// Validates recipe status transitions (TODO-1017 Phase 4)
    /// Valid transitions: D→A, D→X, A→X, A→B, P→A, P→B
    /// Invalid: X→anything (archived is final), B→anything (abandoned is final)
    /// </summary>
    private static void ValidateStatusTransition(char currentStatus, char newStatus)
    {
        // Allow same status (no-op)
        if (currentStatus == newStatus) return;
        
        // Archived and Abandoned are terminal states
        if (currentStatus == 'X')
            throw new InvalidOperationException("Cannot change status of archived recipe. Create new version instead.");
        if (currentStatus == 'B')
            throw new InvalidOperationException("Cannot change status of abandoned recipe.");
        
        // Valid transitions
        var validTransitions = new Dictionary<char, char[]>
        {
            { 'D', new[] { 'A', 'X', 'B' } },      // Draft → Active, Archived, Abandoned
            { 'A', new[] { 'X', 'B' } }               // Active → Archived, Abandoned
            //D = draft, A = Active, X = Archived, B = abandoned
        };
        
        if (!validTransitions.ContainsKey(currentStatus) || !validTransitions[currentStatus].Contains(newStatus))
        {
            throw new InvalidOperationException(
                $"Invalid status transition from '{currentStatus}' to '{newStatus}'. " +
                $"Valid transitions: {string.Join(", ", validTransitions.GetValueOrDefault(currentStatus, Array.Empty<char>()))}");
        }
    }

    private async Task<RecipeDetailDto> MapToDtoAsync(RecipeDetail recipe)
    {
        // Look up approver name from app_user table if approved_by is set
        string? approverName = null;
        if (recipe.ApprovedBy.HasValue)
        {
            var appUser = await _context.SystemUsers
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == recipe.ApprovedBy.Value);
            
            if (appUser != null)
            {
                approverName = $"{appUser.FirstName} {appUser.LastName}";
            }
        }

        Guid? masterExternalId = recipe.ExternalId;
        if (recipe.MasterId.HasValue && recipe.MasterId.Value != recipe.Id)
        {
            masterExternalId = await _context.RecipeDetails
                .AsNoTracking()
                .Where(r => r.Id == recipe.MasterId.Value)
                .Select(r => (Guid?)r.ExternalId)
                .FirstOrDefaultAsync();
        }
        
        // Resolve product ExternalId + Name in a single query
        Guid? productExternalId = null;
        string? productName = null;
        if (recipe.ProductId.HasValue)
        {
            var productInfo = await _context.SellableProducts
                .AsNoTracking()
                .Where(p => p.Id == recipe.ProductId.Value)
                .Select(p => new { p.ExternalId, p.Name })
                .FirstOrDefaultAsync();
            productExternalId = productInfo?.ExternalId;
            productName = productInfo?.Name;
        }

        return new RecipeDetailDto
        {
            ExternalId = recipe.ExternalId,
            MasterRecipeExternalId = masterExternalId,
            RecipeName = recipe.RecipeName,
            Description = recipe.Description,
            ProductExternalId = productExternalId,
            ProductName = productName,
            YieldServingCnt = recipe.YieldServingCnt,
            YieldUnit = recipe.YieldUnit,
            UnitsPerServing = recipe.UnitsPerServing,
            CostPerUnit = recipe.CostPerUnit,
            
            // Timing metadata (TODO-1017)
            PrepTimeMin = recipe.PrepTimeMin,
            ActiveTimeMin = recipe.ActiveTimeMin,
            CookTimeMin = recipe.CookTimeMin,
            RestTimeMin = recipe.RestTimeMin,
            InactiveTimeMin = recipe.InactiveTimeMin,
            TotalTimeMin = recipe.TotalTimeMin,
            ShelfLifeDayCnt = recipe.ShelfLifeDayCnt,
            
            // Versioning fields (TODO-1017)
            RecipeVersionNbr = recipe.RecipeVersionNbr,
            RecipeStatusCd = recipe.RecipeStatusCd,
            StartDt = recipe.StartDt,
            EndDt = recipe.EndDt,
            ApprovedBy = recipe.ApprovedBy,
            ApprovedAt = recipe.ApprovedAt,
            ApproverName = approverName,
            
            CreatedAt = recipe.CreatedAt,
            CreatedBy = recipe.CreatedBy,
            UpdatedAt = recipe.UpdatedAt,
            UpdatedBy = recipe.UpdatedBy,
            Compositions = recipe.Composition?.Select(c => new RecipeCompositionDto
            {
                ExternalId = c.ExternalId,
                CompositionType = c.CompositionType
            }).ToList() ?? new List<RecipeCompositionDto>(),

            Steps = recipe.Steps?.Select(s => new RecipeStepDto
            {
                ExternalId = s.ExternalId,
                StepNumber = s.StepNumber,
                StepInstructionText = s.StepInstructionText,
            }).ToList() ?? new List<RecipeStepDto>()
        };
    }

    // Note: MapIngredientToDto moved to RecipeIngredientService (TODO-1020)
}

// DTOs
public class RecipeDetailDto
{
    public Guid ExternalId { get; set; }
    public Guid? MasterRecipeExternalId { get; set; }
    public string RecipeName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? ProductExternalId { get; set; }
    public string? ProductName { get; set; }
    public int YieldServingCnt { get; set; }
    public string YieldUnit { get; set; } = "g";
    public decimal? CostPerUnit { get; set; }
    
    // Timing metadata (TODO-1017 Phase 3)
    public int? PrepTimeMin { get; set; }
    public int? ActiveTimeMin { get; set; }
    public int? CookTimeMin { get; set; }
    public int? RestTimeMin { get; set; }
    public int? InactiveTimeMin { get; set; }
    public int? TotalTimeMin { get; set; }
    public decimal? ShelfLifeDayCnt { get; set; }
    public decimal? UnitsPerServing { get; set; }
    
    // Versioning fields (TODO-1017 Phase 3)
    public int RecipeVersionNbr { get; set; }
    public char RecipeStatusCd { get; set; } // D=draft, A=active, X=archived, P=pending, B=abandoned
    public DateTime? StartDt { get; set; }
    public DateTime? EndDt { get; set; }
    public Guid? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? ApproverName { get; set; } // Denormalized for display
    
    public DateTime CreatedAt { get; set; }
    public Guid CreatedBy { get; set; } = Guid.Empty;
    public DateTime UpdatedAt { get; set; }
    public Guid? UpdatedBy { get; set; } = Guid.Empty;
    public List<RecipeCompositionDto> Compositions { get; set; } = new List<RecipeCompositionDto>();
    public List<RecipeStepDto> Steps { get; set; } = new List<RecipeStepDto>();
}

public class CreateRecipeRequest
{
    public string RecipeName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid ProductExternalId { get; set; }
    public Guid? MasterRecipeExternalId { get; set; }
    public int YieldServingCnt { get; set; } = 1;
    public string? YieldUnit { get; set; }
    public decimal? CostPerUnit { get; set; }
    
    // Timing metadata (TODO-1017 Phase 3) - optional
    public int? PrepTimeMin { get; set; }
    public int? ActiveTimeMin { get; set; }
    public int? CookTimeMin { get; set; }
    public int? RestTimeMin { get; set; }
    public int? InactiveTimeMin { get; set; }
    public int? TotalTimeMin { get; set; }
    public decimal? ShelfLifeDayCnt { get; set; }
    public decimal? UnitsPerServing { get; set; }

    // Versioning (TODO-1017 Phase 3) - optional, defaults applied by service
    public char? RecipeStatusCd { get; set; } // Defaults to 'D' (draft)
    public DateTime? StartDt { get; set; }
}

/// <summary>
/// Input for nested ingredient creation (no external IDs yet)
/// </summary>
public class RecipeIngredientInput
{
    public Guid? InventoryItemExternalId { get; set; }
    public Guid? RecipeComponentProductExternalId { get; set; }
    public decimal QuantityRequired { get; set; }
    public string Unit { get; set; } = "cups";
    public string? PurposeTxt { get; set; }
    public decimal? CostPerUnit { get; set; } // Optional, defaults to 0 if not provided
    public string? SectionName { get; set; }
    public int? SequenceNumber { get; set; }
}

/// <summary>
/// Input for nested composition creation (no external IDs yet)
/// </summary>
public class RecipeCompositionInput
{
    public string CompositionType { get; set; } = "STEP"; // STEP or RECIPE
    public Guid? SubRecipeExternalId { get; set; } // For RECIPE type
    public decimal? Quantity { get; set; } // For RECIPE type
    public string? Unit { get; set; } // For RECIPE type
    public string? StepText { get; set; } // For STEP type
    public string SectionName { get; set; } = string.Empty;
    public int SequenceNumber { get; set; }
}

/// <summary>
/// Input for nested step creation (no external IDs yet)
/// </summary>
public class RecipeStepInput
{
    public string StepInstructionText { get; set; } = string.Empty;
    public int StepNumber {get;set;}
}
/// <summary>
/// Comprehensive request to create recipe with all nested details in a single transaction
/// </summary>
public class CreateRecipeWithDetailsRequest
{
    // Master recipe properties
    public string RecipeName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? ProductExternalId { get; set; } // Optional: link to finished product (UUID, never PK)
    public Guid? MasterRecipeExternalId { get; set; } // Optional: link to master recipe for versioning
    public int YieldServingCnt { get; set; } = 1;
    public string? YieldUnit { get; set; }
    public decimal? CostPerUnit { get; set; }
    
    // Timing metadata (optional)
    public int? PrepTimeMin { get; set; }
    public int? ActiveTimeMin { get; set; }
    public int? CookTimeMin { get; set; }
    public int? RestTimeMin { get; set; }
    public int? InactiveTimeMin { get; set; }
    public int? TotalTimeMin { get; set; }
    public decimal ShelfLifeDayCnt { get; set; }
    public decimal UnitsPerServing { get; set; }
    // Versioning (optional)
    public char? RecipeStatusCd { get; set; }
    public DateTime? StartDt { get; set; }
    
    // Nested collections (created atomically with master recipe)
    public List<RecipeIngredientInput> Ingredients { get; set; } = new List<RecipeIngredientInput>();
    public List<RecipeCompositionInput> Compositions { get; set; } = new List<RecipeCompositionInput>();
    public List<RecipeStepInput> Steps { get; set; } = new List<RecipeStepInput>();

}

public class UpdateRecipeWithDetailsRequest
{
    // Master recipe properties
    public Guid ExternalId { get; set; } 
    public string RecipeName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? ProductExternalId { get; set; } // Optional: link to finished product (UUID, never PK)
    public int YieldServingCnt { get; set; } = 1;
    public string? YieldUnit { get; set; }
    public decimal? CostPerUnit { get; set; }
    public decimal UnitsPerServing { get; set; }

    // Timing metadata (optional)
    public int? PrepTimeMin { get; set; }
    public int? ActiveTimeMin { get; set; }
    public int? CookTimeMin { get; set; }
    public int? RestTimeMin { get; set; }
    public int? InactiveTimeMin { get; set; }
    public int? TotalTimeMin { get; set; }
    public decimal ShelfLifeDayCnt { get; set; }
    
    // Versioning (optional)
    public char? RecipeStatusCd { get; set; }
    public DateTime? StartDt { get; set; }
    
    // Nested collections (created atomically with master recipe)
    public List<RecipeIngredientInput> Ingredients { get; set; } = new List<RecipeIngredientInput>();
    public List<RecipeCompositionInput> Compositions { get; set; } = new List<RecipeCompositionInput>();
    public List<RecipeStepInput> Steps { get; set; } = new List<RecipeStepInput>();

}
public class UpdateRecipeRequest
{
    public long? ProductId {get; set;}
    public Guid? ProductExternalId { get; set; } // Optional: re-link to a different finished product
    public string? RecipeName { get; set; }
    public string? Description { get; set; }
    public int? YieldServingCnt { get; set; }
    public string? YieldUnit { get; set; }
    public decimal? CostPerUnit { get; set; }
    public bool? IsActive { get; set; }
    
    // Timing metadata (TODO-1017 Phase 3) - optional
    public int? PrepTimeMin { get; set; }
    public int? ActiveTimeMin { get; set; }
    public int? CookTimeMin { get; set; }
    public int? RestTimeMin { get; set; }
    public int? InactiveTimeMin { get; set; }
    public int? TotalTimeMin { get; set; }
    public decimal ShelfLifeDayCnt { get; set; }
    public decimal UnitsPerServing { get; set; }
    
    // Status transition (TODO-1017 Phase 3) - optional
    public char? RecipeStatusCd { get; set; } // For status transitions
    
    // Optimistic locking (required for updates)
    public int? VersionNbr { get; set; }

}

/// <summary>
/// DTO for recipe version summary (TODO-1017 Phase 4)
/// Used when listing all versions of a recipe
/// </summary>
public class RecipeVersionSummaryDto
{
    public Guid ExternalId { get; set; }
    public Guid? MasterRecipeExternalId { get; set; }
    public string RecipeName { get; set; } = string.Empty;
    public int VersionNumber { get; set; }
    public string Status { get; set; } = string.Empty; // D=draft, A=active, X=archived, P=pending, B=abandoned
    public DateTime CreatedAt { get; set; }
    public Guid CreatedBy { get; set; } = Guid.Empty;
    public DateTime? StartDt { get; set; }
    public DateTime? EndDt { get; set; }
    public Guid? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public int YieldServingCnt { get; set; }
    public string YieldUnit { get; set; } = string.Empty;
    public decimal? CostPerUnit { get; set; }
}

/// <summary>
/// Paginated result wrapper for API responses
/// </summary>
public class PaginatedResult<T>
{
    public List<T> Data { get; set; } = new List<T>();
    public int TotalCount { get; set; }
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
}


// Note: RecipeIngredient DTOs moved to RecipeIngredientDtos.cs (TODO-1020)
// Note: RecipeComposition DTOs moved to RecipeCompositionDtos.cs (TODO-1020)
