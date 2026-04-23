using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PreOrderApp.Services;
using PreOrderApp.DTOs;
using PreOrderApp.Filters;
using PreOrderApp.Models;
namespace PreOrderApp.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[ValidateTenantAccess]
public class RecipesController : ControllerBase
{
    private readonly IRecipeService _recipeService;
    private readonly IRecipeCostingService _costingService;
    private readonly IRecipeIngredientService _ingredientService;
    private readonly IRecipeCompositionService _compositionService;
    private readonly IRecipeStepService _stepService;
    private readonly ILogger<RecipesController> _logger;
    private readonly IOrganizationContextService _orgContext;
    
    public RecipesController(
        IRecipeService recipeService, 
        IRecipeCostingService costingService, 
        IRecipeIngredientService ingredientService,
        IRecipeCompositionService compositionService,
        IRecipeStepService stepService,
        ILogger<RecipesController> logger, 
        IOrganizationContextService orgContext)
    {
        _recipeService = recipeService;
        _costingService = costingService;
        _ingredientService = ingredientService;
        _compositionService = compositionService;
        _stepService = stepService;
        _logger = logger;
        _orgContext = orgContext;
    }

 
    [HttpGet]
    public async Task<ActionResult<PaginatedResult<RecipeDetailDto>>> GetRecipes(
        int? pageNumber = null, 
        int? pageSize = null,
        string? sortBy = null,
        string? sortDirection = null)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var recipes = await _recipeService.GetRecipesAsync(orgId, pageNumber, pageSize, sortBy, sortDirection);

            if (!IsAdminUser())
            {
                foreach (var recipe in recipes.Data)
                {
                    recipe.CostPerUnit = null;
                }
            }

            return Ok(recipes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recipes");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpGet("{externalId:guid}")]

    public async Task<ActionResult<RecipeDetailDto>> GetRecipe(Guid externalId)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var recipe = await _recipeService.GetRecipeByExternalIdAsync(externalId, orgId);
            
            if (recipe == null)
                return NotFound(new { message = "Recipe not found" });

            if (!IsAdminUser())
            {
                recipe.CostPerUnit = null;
            }
            
            return Ok(recipe);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recipe {ExternalId}", externalId);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    // [HttpPost]
    // [RequireTenantAdmin]
    // public async Task<ActionResult<RecipeDetailDto>> CreateRecipe([FromBody] CreateRecipeRequest request)
    // {
    //     try
    //     {
    //         var orgId = _orgContext.GetCurrentOrganizationId();
    //         var userId = _orgContext.GetCurrentUserId();
            
    //         var recipe = await _recipeService.CreateRecipeAsync(request, orgId, userId);
    //         return CreatedAtAction(nameof(GetRecipe), new { externalId = recipe.ExternalId }, recipe);
    //     }
    //     catch (Exception ex)
    //     {
    //         _logger.LogError(ex, "Error creating recipe");
    //         return StatusCode(500, new { message = ex.Message });
    //     }
    // }

    /// <summary>
    /// Creates a recipe with all nested ingredients and compositions in a single atomic transaction
    /// This endpoint provides better performance and atomicity compared to multiple separate API calls
    /// </summary>
    [HttpPost("with-details")]
    [RequireTenantAdmin]
    public async Task<ActionResult<RecipeDetailDto>> CreateRecipeWithDetails([FromBody] CreateRecipeWithDetailsRequest request)
    {
        // Get auth context outside try-catch so auth failures return 401, not 500
        var orgId = _orgContext.GetCurrentOrganizationId();
        var userId = _orgContext.GetCurrentUserId();
        
        try
        {
            Console.WriteLine($">>> API CALLED: CreateRecipeWithDetails for recipe '{request.RecipeName}'");
            Console.WriteLine($">>> Organization: {orgId}, User: {userId}");
            Console.WriteLine($">>> ProductExternalId: {request.ProductExternalId?.ToString() ?? "NULL"}");
            Console.WriteLine($">>> Ingredients count: {request.Ingredients?.Count ?? 0}");
            Console.WriteLine($">>> Compositions count: {request.Compositions?.Count ?? 0}");
            
            var recipe = await _recipeService.CreateRecipeWithDetailsAsync(request, orgId, userId);
            
            Console.WriteLine($">>> SUCCESS: Recipe created with ExternalId: {recipe.ExternalId}");
            return CreatedAtAction(nameof(GetRecipe), new { externalId = recipe.ExternalId }, recipe);
        }
        catch (Exception ex)
        {
            Console.WriteLine($">>> ERROR creating recipe: {ex.Message}");
            _logger.LogError(ex, "Error creating recipe with details");
            return StatusCode(500, new { message = ex.Message });
        }
    }



    [HttpPost("clone")]
    [RequireTenantAdmin]
    public async Task<ActionResult<RecipeDetailDto>> CloneRecipe(
        [FromBody] CloneRecipeRequest request)
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        var userId = _orgContext.GetCurrentUserId();
        try
        {
            var recipe = await _recipeService.CreateCloneRecipeWithDetailsAsync(
                request.RecipeExternalIdToClone,
                orgId,
                userId
            );
            
            return CreatedAtAction(nameof(GetRecipe), new { externalId = recipe.ExternalId }, recipe);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("Unable to clone recipe"))
        {
            return Conflict(new { error = ex.Message }); // 409 Conflict
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message }); // 400 Bad Request
        }
        catch (Exception ex)
            {
                Console.WriteLine($">>> ERROR cloning recipe: {ex.Message}");
                _logger.LogError(ex, "Error cloning recipe");
                return StatusCode(500, new { message = ex.Message });
            }
    }
     

    [HttpPost("draft-from-recipe")]
    [RequireTenantAdmin]
    public async Task<ActionResult<RecipeDetailDto>> CreateDraftFromRecipe(
        [FromBody] CreateDraftFromRecipeRequest request)
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        var userId = _orgContext.GetCurrentUserId();
        try
        {
            var recipe = await _recipeService.CreateDraftRecipeWithDetailsAsync(
                request.RecipeExternalIdToClone,
                orgId,
                userId
            );
            
            return CreatedAtAction(nameof(GetRecipe), new { externalId = recipe.ExternalId }, recipe);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("draft version already exists"))
        {
            return Conflict(new { error = ex.Message }); // 409 Conflict
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message }); // 400 Bad Request
        }
        catch (Exception ex)
            {
                Console.WriteLine($">>> ERROR cloning recipe for draft: {ex.Message}");
                _logger.LogError(ex, "Error cloning recipe for draft");
                return StatusCode(500, new { message = ex.Message });
            }
    }
 


    /// <summary>
    /// Update a recipe with all nested ingredients and compositions in a single atomic transaction
    /// This endpoint provides better performance and atomicity compared to multiple separate API calls
    /// </summary>
    [HttpPut("with-details")]
    [RequireTenantAdmin]
    public async Task<ActionResult<RecipeDetailDto>> UpdateRecipeWithDetails([FromBody] UpdateRecipeWithDetailsRequest request)
    {
        // Get auth context outside try-catch so auth failures return 401, not 500
        var orgId = _orgContext.GetCurrentOrganizationId();
        var userId = _orgContext.GetCurrentUserId();
        try
        {

            var recipe = await _recipeService.UpdateRecipeWithDetailsAsync(request, orgId, userId);
            
            Console.WriteLine($">>> SUCCESS: Recipe updated with ExternalId: {recipe.ExternalId}");
            return CreatedAtAction(nameof(GetRecipe), new { externalId = recipe.ExternalId }, recipe);
        }
        catch (Exception ex)
        {
            Console.WriteLine($">>> ERROR updating recipe: {ex.Message}");
            _logger.LogError(ex, "Error updating recipe with details");
            return StatusCode(500, new { message = ex.Message });
        }
    }    

    [HttpPut("{externalId:guid}")]
    public async Task<ActionResult<RecipeDetailDto>> UpdateRecipe(Guid externalId, [FromBody] UpdateRecipeRequest request)
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        var userId = _orgContext.GetCurrentUserId();
        try
       {
            
            var recipe = await _recipeService.UpdateRecipeAsync(externalId, request, orgId, userId);
            
            if (recipe == null)
                return NotFound(new { message = "Recipe not found" });
            
            return Ok(recipe);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating recipe {ExternalId}", externalId);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpDelete("{externalId:guid}")]
    [RequireTenantAdmin]
    public async Task<ActionResult> DeleteRecipe(Guid externalId)
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        var userId = _orgContext.GetCurrentUserId();
        try
        {
            await _recipeService.DeleteRecipeAsync(externalId, orgId, userId);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting recipe {ExternalId}", externalId);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>RECIPE(7) FIX: Check if other recipes use a product as their finished good
    /// Used when removing/changing a product assignment on recipe editor to alert if last one</summary>
    [HttpGet("check-product-usage/{productExternalId:guid}")]
    public async Task<ActionResult<ProductUsageCheckDto>> CheckProductUsageByRecipes(Guid productExternalId)
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        try
        {
            var result = await _recipeService.CheckProductUsageByRecipesAsync(productExternalId, orgId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking product usage for {ProductExternalId}", productExternalId);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    // Version management endpoints (TODO-1017 Phase 4)
    
    [HttpGet("{recipeExternalId:guid}/versions")]
    public async Task<ActionResult<List<RecipeVersionSummaryDto>>> GetRecipeVersions(Guid recipeExternalId)
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        try
        {
            var versions = await _recipeService.GetRecipeVersionsAsync(recipeExternalId, orgId);

            if (!IsAdminUser())
            {
                foreach (var version in versions)
                {
                    version.CostPerUnit = null;
                }
            }

            return Ok(versions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recipe versions for {RecipeExternalId}", recipeExternalId);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPut("{externalId:guid}/activate")]
    [RequireTenantAdmin]
    public async Task<ActionResult<RecipeDetailDto>> ActivateRecipeVersion(Guid externalId)
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        var userId = _orgContext.GetCurrentUserId();
        try
        {
            
            var recipe = await _recipeService.ActivateRecipeVersionAsync(externalId, orgId, userId);
            return Ok(recipe);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error activating recipe version {ExternalId}", externalId);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPut("{externalId:guid}/archive")]
    [RequireTenantAdmin]
    public async Task<ActionResult<RecipeDetailDto>> ArchiveRecipeVersion(Guid externalId)
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        var userId = _orgContext.GetCurrentUserId();
        try
        {          
            var recipe = await _recipeService.ArchiveRecipeVersionAsync(externalId, orgId, userId);
            return Ok(recipe);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error archiving recipe version {ExternalId}", externalId);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    // Ingredient management convenience endpoints (Phase 3.2.1 - Hybrid Option C)
    // Delegates to dedicated RecipeIngredientService
    
    [HttpGet("{recipeExternalId:guid}/ingredients")]
    public async Task<ActionResult<List<RecipeIngredientDto>>> GetIngredients(Guid recipeExternalId)
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        var userId = _orgContext.GetCurrentUserId();
        try
        {
            var ingredients = await _ingredientService.GetIngredientsByRecipeAsync(recipeExternalId, orgId);
            return Ok(ingredients);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting ingredients for recipe {RecipeExternalId}", recipeExternalId);
            return StatusCode(500, new { message = ex.Message });
        }
    }
    
    // Composition management convenience endpoints (TODO-1020 Part 3)
    // Delegates to dedicated RecipeCompositionService
    
    [HttpGet("{recipeExternalId:guid}/compositions")]
    public async Task<ActionResult<List<RecipeCompositionDto>>> GetCompositions(Guid recipeExternalId)
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        var userId = _orgContext.GetCurrentUserId();
        try
        {
            var compositions = await _compositionService.GetCompositionsByRecipeAsync(recipeExternalId, orgId);
            return Ok(compositions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting compositions for recipe {RecipeExternalId}", recipeExternalId);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    // Step management convenience endpoints.
    // Delegates to dedicated RecipeStepService
    
    [HttpGet("{recipeExternalId:guid}/steps")]
    public async Task<ActionResult<List<RecipeStepDto>>> GetSteps(Guid recipeExternalId)
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        var userId = _orgContext.GetCurrentUserId();
        try
        {
            var steps = await _stepService.GetStepsByRecipeExternalIdAsync(recipeExternalId, orgId);
            return Ok(steps);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting steps for recipe {RecipeExternalId}", recipeExternalId);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    // Recipe costing endpoints (Phase 3.2.2)
    
    [HttpGet("{recipeExternalId:guid}/cost")]
    [RequireTenantAdmin]
    public async Task<ActionResult<RecipeCostResponse>> GetRecipeCost(Guid recipeExternalId)
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        try
        {
            var cost = await _costingService.CalculateRecipeCostAsync(recipeExternalId, orgId);
            return Ok(cost);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating recipe cost for {RecipeExternalId}", recipeExternalId);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpGet("{recipeExternalId:guid}/cost/breakdown")]
    [RequireTenantAdmin]
    public async Task<ActionResult<RecipeCostBreakdownDto>> GetRecipeCostBreakdown(Guid recipeExternalId)
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        try
        {
            var breakdown = await _costingService.GetCostBreakdownAsync(recipeExternalId, orgId);
            return Ok(breakdown);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cost breakdown for {RecipeExternalId}", recipeExternalId);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPatch("{externalId:guid}/cost")]
    [RequireTenantAdmin]
    public async Task<ActionResult<RecipeDetailDto>> UpdateRecipeCost(Guid externalId, [FromBody] UpdateRecipeCostRequest request)
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        var userId = _orgContext.GetCurrentUserId();
        try
        {
            var recipe = await _recipeService.UpdateRecipeCostAsync(externalId, request.CostPerUnit, orgId, userId);
            return Ok(recipe);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating recipe cost {ExternalId}", externalId);
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost("batch-cost")]
    public async Task<ActionResult<decimal>> CalculateBatchCost([FromBody] CalculateBatchCostRequest request)
    {
        var orgId = _orgContext.GetCurrentOrganizationId();
        var userId = _orgContext.GetCurrentUserId();
        try
        {
            var batchCost = await _costingService.CalculateBatchCostAsync(request.RecipeExternalId, request.QuantityProduced, orgId);
            return Ok(new { batchCost });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating batch cost");
            return StatusCode(500, new { message = ex.Message });
        }
    }

 public class CreateDraftFromRecipeRequest
 {
     public Guid RecipeExternalIdToClone { get; set; }
 }

public class UpdateRecipeCostRequest
{
    public decimal? CostPerUnit { get; set; }
    public bool CostPerUnitIsOverride { get; set; }
}

 public class CloneRecipeRequest
 {
     public Guid RecipeExternalIdToClone { get; set; }
 }

    private bool IsAdminUser()
    {
        return User.IsInRole(UserRoles.SystemAdmin) || User.IsInRole(UserRoles.CompanyAdmin);
    }
}
