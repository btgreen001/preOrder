using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PreOrderApp.DTOs;
using PreOrderApp.Services;
using PreOrderApp.Filters;

namespace PreOrderApp.Controllers;

[ApiController]
[Route("api/recipe-compositions")]
[Authorize]
[ValidateTenantAccess]
public class RecipeCompositionsController : ControllerBase
{
    private readonly IRecipeCompositionService _service;
    private readonly IOrganizationContextService _organizationContext;
    private readonly ILogger<RecipeCompositionsController> _logger;

    public RecipeCompositionsController(
        IRecipeCompositionService service,
        IOrganizationContextService organizationContext,
        ILogger<RecipeCompositionsController> logger)
    {
        _service = service;
        _organizationContext = organizationContext;
        _logger = logger;
    }

    /// <summary>
    /// Create a new recipe composition
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<RecipeCompositionDto>> CreateComposition([FromBody] CreateRecipeCompositionRequest request)
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

            var composition = await _service.CreateCompositionAsync(request, organizationId, userId);

            return CreatedAtAction(nameof(GetCompositionById), new { externalId = composition.ExternalId }, composition);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid operation when creating recipe composition");
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid argument when creating recipe composition");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error creating recipe composition");
            return StatusCode(500, new { message = "An error occurred while creating the recipe composition" });
        }
    }

    /// <summary>
    /// Get all recipe compositions for a specific recipe
    /// </summary>
    [HttpGet("recipe/{recipeExternalId:guid}")]
    public async Task<ActionResult<List<RecipeCompositionDto>>> GetCompositionsByRecipe(Guid recipeExternalId)
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
            var compositions = await _service.GetCompositionsByRecipeAsync(recipeExternalId, organizationId);
            return Ok(compositions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting compositions for recipe {RecipeId}", recipeExternalId);
            return StatusCode(500, new { message = "An error occurred while retrieving recipe compositions" });
        }
    }

    /// <summary>
    /// Get recipe composition by external ID
    /// </summary>
    [HttpGet("{externalId:guid}")]
    public async Task<ActionResult<RecipeCompositionDto>> GetCompositionById(Guid externalId)
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
            var composition = await _service.GetCompositionByIdAsync(externalId, organizationId);

            if (composition == null)
            {
                return NotFound(new { message = $"Recipe composition with ID {externalId} not found" });
            }

            return Ok(composition);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving recipe composition {ExternalId}", externalId);
            return StatusCode(500, new { message = "An error occurred while retrieving the recipe composition" });
        }
    }

    /// <summary>
    /// Update an existing recipe composition
    /// </summary>
    [HttpPut("{externalId:guid}")]
    public async Task<ActionResult<RecipeCompositionDto>> UpdateComposition(Guid externalId, [FromBody] UpdateRecipeCompositionRequest request)
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

            var composition = await _service.UpdateCompositionAsync(externalId, request, organizationId, userId);

            return Ok(composition);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Recipe composition {ExternalId} not found", externalId);
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid argument when updating recipe composition {ExternalId}", externalId);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating recipe composition {ExternalId}", externalId);
            return StatusCode(500, new { message = "An error occurred while updating the recipe composition" });
        }
    }

    /// <summary>
    /// Soft delete a recipe composition
    /// </summary>
    [HttpDelete("{externalId:guid}")]
    public async Task<IActionResult> DeleteComposition(Guid externalId)
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

            await _service.DeleteCompositionAsync(externalId, organizationId, userId);

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Recipe composition {ExternalId} not found", externalId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting recipe composition {ExternalId}", externalId);
            return StatusCode(500, new { message = "An error occurred while deleting the recipe composition" });
        }
    }
}
