using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderMgmt.DTOs;
using OrderMgmt.Models;
using OrderMgmt.Services;
using OrderMgmt.Filters;

namespace OrderMgmt.Controllers;

[ApiController]
[Route("api/recipe-ingredients")]
[Authorize]
[ValidateTenantAccess]
public class RecipeIngredientsController : ControllerBase
{
    private readonly IRecipeIngredientService _service;
    private readonly IOrganizationContextService _organizationContext;
    private readonly ILogger<RecipeIngredientsController> _logger;

    public RecipeIngredientsController(
        IRecipeIngredientService service,
        IOrganizationContextService organizationContext,
        ILogger<RecipeIngredientsController> logger)
    {
        _service = service;
        _organizationContext = organizationContext;
        _logger = logger;
    }

    /// <summary>
    /// Create a new recipe ingredient
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<RecipeIngredientDto>> CreateIngredient([FromBody] CreateRecipeIngredientRequest request)
    {
        Guid organizationId;
        try
        {
            organizationId = _organizationContext.GetCurrentOrganizationId();
        }
        catch
        {
            return Unauthorized(new { message = "Invalid or missing organization context" });
        }

        Guid userId;
        try
        {
            userId = _organizationContext.GetCurrentUserId();
        }
        catch
        {
            return Unauthorized(new { message = "Invalid or missing user context" });
        }

        try
        {

            var ingredient = await _service.CreateIngredientAsync(request, organizationId, userId);

            return CreatedAtAction(nameof(GetIngredientById), new { externalId = ingredient.ExternalId }, ingredient);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid operation when creating recipe ingredient");
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid argument when creating recipe ingredient");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error creating recipe ingredient");
            return StatusCode(500, new { message = "An error occurred while creating the recipe ingredient" });
        }
    }

    /// <summary>
    /// Get all recipe ingredients for a specific recipe
    /// </summary>
    [HttpGet("recipe/{recipeExternalId:guid}")]
    public async Task<ActionResult<List<RecipeIngredientDto>>> GetIngredientsByRecipe(Guid recipeExternalId)
    {
        Guid organizationId;
        try
        {
            organizationId = _organizationContext.GetCurrentOrganizationId();
        }
        catch
        {
            return Unauthorized(new { message = "Invalid or missing organization context" });
        }

        try
        {
            bool isAdmin = User.IsInRole(UserRoles.SystemAdmin) || User.IsInRole(UserRoles.CompanyAdmin);

            if (isAdmin)
            {
                var withCost = await _service.GetIngredientsByRecipeWithCostAsync(recipeExternalId, organizationId);
                return Ok(withCost);
            }

            var ingredients = await _service.GetIngredientsByRecipeAsync(recipeExternalId, organizationId);
            return Ok(ingredients);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting ingredients for recipe {RecipeId}", recipeExternalId);
            return StatusCode(500, new { message = "An error occurred while retrieving recipe ingredients" });
        }
    }

    /// <summary>
    /// Get recipe ingredient by external ID
    /// </summary>
    [HttpGet("{externalId:guid}")]
    public async Task<ActionResult<RecipeIngredientDto>> GetIngredientById(Guid externalId)
    {
        Guid organizationId;
        try
        {
            organizationId = _organizationContext.GetCurrentOrganizationId();
        }
        catch
        {
            return Unauthorized(new { message = "Invalid or missing organization context" });
        }

        try
        {
            var ingredient = await _service.GetIngredientByIdAsync(externalId, organizationId);

            if (ingredient == null)
            {
                return NotFound(new { message = $"Recipe ingredient with ID {externalId} not found" });
            }

            return Ok(ingredient);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving recipe ingredient {ExternalId}", externalId);
            return StatusCode(500, new { message = "An error occurred while retrieving the recipe ingredient" });
        }
    }

    /// <summary>
    /// Update an existing recipe ingredient
    /// </summary>
    [HttpPut("{externalId:guid}")]
    public async Task<ActionResult<RecipeIngredientDto>> UpdateIngredient(Guid externalId, [FromBody] UpdateRecipeIngredientRequest request)
    {
        Guid organizationId;
        try
        {
            organizationId = _organizationContext.GetCurrentOrganizationId();
        }
        catch
        {
            return Unauthorized(new { message = "Invalid or missing organization context" });
        }

        Guid userId;
        try
        {
            userId = _organizationContext.GetCurrentUserId();
        }
        catch
        {
            return Unauthorized(new { message = "Invalid or missing user context" });
        }

        try
        {

            var ingredient = await _service.UpdateIngredientAsync(externalId, request, organizationId, userId);

            return Ok(ingredient);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Recipe ingredient {ExternalId} not found", externalId);
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid argument when updating recipe ingredient {ExternalId}", externalId);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating recipe ingredient {ExternalId}", externalId);
            return StatusCode(500, new { message = "An error occurred while updating the recipe ingredient" });
        }
    }

    /// <summary>
    /// Reorder all ingredients for a recipe in a single call.
    /// </summary>
    [HttpPut("recipe/{recipeExternalId:guid}/reorder")]
    public async Task<IActionResult> ReorderIngredients(Guid recipeExternalId, [FromBody] ReorderIngredientsRequest request)
    {
        Guid organizationId;
        try { organizationId = _organizationContext.GetCurrentOrganizationId(); }
        catch { return Unauthorized(new { message = "Invalid or missing organization context" }); }

        Guid userId;
        try { userId = _organizationContext.GetCurrentUserId(); }
        catch { return Unauthorized(new { message = "Invalid or missing user context" }); }

        try
        {
            await _service.ReorderIngredientsAsync(recipeExternalId, request, organizationId, userId);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Reorder failed for recipe {RecipeId}", recipeExternalId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reordering ingredients for recipe {RecipeId}", recipeExternalId);
            return StatusCode(500, new { message = "An error occurred while reordering ingredients" });
        }
    }

    /// <summary>
    /// Soft delete a recipe ingredient
    /// </summary>
    [HttpDelete("{externalId:guid}")]
    public async Task<IActionResult> DeleteIngredient(Guid externalId)
    {
        Guid organizationId;
        try
        {
            organizationId = _organizationContext.GetCurrentOrganizationId();
        }
        catch
        {
            return Unauthorized(new { message = "Invalid or missing organization context" });
        }

        Guid userId;
        try
        {
            userId = _organizationContext.GetCurrentUserId();
        }
        catch
        {
            return Unauthorized(new { message = "Invalid or missing user context" });
        }

        try
        {

            await _service.DeleteIngredientAsync(externalId, organizationId, userId);

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Recipe ingredient {ExternalId} not found", externalId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting recipe ingredient {ExternalId}", externalId);
            return StatusCode(500, new { message = "An error occurred while deleting the recipe ingredient" });
        }
    }
}
