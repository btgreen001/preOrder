using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PreOrderApp.Data;
using PreOrderApp.Filters;
using PreOrderApp.Models;
using PreOrderApp.Services;

namespace PreOrderApp.Controllers
{
    [ApiController]
    [ValidateTenantAccess] 
    [Route("api/recipe-steps")]
    [Authorize]
    public class RecipeStepController : ControllerBase
    {
        private readonly IRecipeStepService _service;
        private readonly IOrganizationContextService _orgContext;
        private readonly ILogger<RecipeStepController> _logger;

        public RecipeStepController(IRecipeStepService service, IOrganizationContextService orgContext, ILogger<RecipeStepController> logger)
        {
            _service = service;
            _orgContext = orgContext;
            _logger = logger;
        }

        [HttpGet("{externalId:guid}")]
        public async Task<ActionResult<RecipeStepDto>> GetStep(Guid externalId)
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var step = await _service.GetStepByExternalIdAsync(externalId, orgId);
            if (step == null) return NotFound();
            return Ok(step);
        }

        [HttpGet("by-recipe/{recipeExternalId:guid}")]
        public async Task<ActionResult<List<RecipeStepDto>>> GetStepsByRecipe(Guid recipeExternalId)
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var steps = await _service.GetStepsByRecipeExternalIdAsync(recipeExternalId, orgId);
            return Ok(steps);
        }

        [HttpPost]
        public async Task<ActionResult<RecipeStepDto>> CreateStep([FromBody] CreateRecipeStepRequest step)
        {
            try
            {
                var orgId = _orgContext.GetCurrentOrganizationId();
                var userId = _orgContext.GetCurrentUserId();

                var created = await _service.CreateStepAsync(step, orgId, userId);
                return CreatedAtAction(nameof(GetStep), new { externalId = created.ExternalId }, created);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[RecipeStep.CreateStep] Error creating recipe step");
                throw;
            }
        }

        [HttpPut("{externalId:guid}")]
        public async Task<ActionResult<RecipeStepDto>> UpdateStep(Guid externalId, [FromBody] RecipeStep step)
        {
            try
            {
                var orgId = _orgContext.GetCurrentOrganizationId();
                var userId = _orgContext.GetCurrentUserId();

                var updated = await _service.UpdateStepAsync(externalId, step, orgId, userId);
                if (updated == null)
                    return NotFound();

                return Ok(updated);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[RecipeStep.UpdateStep] Error updating recipe step");
                throw;
            }
        }

        [HttpDelete("{externalId:guid}")]
        public async Task<ActionResult> DeleteStep(Guid externalId)
        {
            try
            {
                var orgId = _orgContext.GetCurrentOrganizationId();
                var userId = _orgContext.GetCurrentUserId();

                var deleted = await _service.DeleteStepAsync(externalId, orgId, userId);
                if (!deleted)
                    return NotFound();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[RecipeStep.DeleteStep] Error deleting recipe step");
                throw;
            }
        }



    }
}
