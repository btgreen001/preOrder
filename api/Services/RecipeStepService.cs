using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PreOrderApp.Data;
using PreOrderApp.Models;

namespace PreOrderApp.Services
{
    public class RecipeStepService : IRecipeStepService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<RecipeStepService> _logger;

        public RecipeStepService(AppDbContext context, ILogger<RecipeStepService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<RecipeStepDto?> GetStepByExternalIdAsync(Guid recipeExternalId, Guid organizationId)
        {
            
            // First find the recipe's numeric ID from its external ID
            var recipe = await _context.RecipeDetails
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.ExternalId == recipeExternalId && r.OrganizationId == organizationId);

            if (recipe == null)
                return null;

            var recipeStep = await _context.RecipeSteps
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.ExternalId == recipe.ExternalId && s.OrganizationId == organizationId && !s.IsDeleted);

            if (recipeStep == null)
                return null;

            return MapRecipeStepToDto(recipeStep);
        }

        public async Task<List<RecipeStepDto>> GetAllStepsByRecipeExternalIdAsync(Guid recipeExternalId, Guid organizationId)
        {
            // First find the recipe's numeric ID from its external ID
            var recipe = await _context.RecipeDetails
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.ExternalId == recipeExternalId && r.OrganizationId == organizationId);
            
            if (recipe == null)
                return new List<RecipeStepDto>();
            
            var steps = await _context.RecipeSteps
                .AsNoTracking()
                .Where(s => s.RecipeDetailId == recipe.Id && s.OrganizationId == organizationId)
                .OrderBy(s => s.StepNumber)
                .ToListAsync();

            return steps.Select(MapRecipeStepToDto).ToList();
        }

        public async Task<List<RecipeStepDto>> GetStepsByRecipeExternalIdAsync(Guid recipeExternalId, Guid organizationId)
        {
            // First find the recipe's numeric ID from its external ID
            var recipe = await _context.RecipeDetails
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.ExternalId == recipeExternalId && r.OrganizationId == organizationId);
            
            if (recipe == null)
                return new List<RecipeStepDto>();
            
            var steps = await _context.RecipeSteps
                .AsNoTracking()
                .Where(s => s.RecipeDetailId == recipe.Id && s.OrganizationId == organizationId && !s.IsDeleted)
                .OrderBy(s => s.StepNumber)
                .ToListAsync();

            return steps.Select(MapRecipeStepToDto).ToList();
        }

        public async Task<RecipeStepDto> CreateStepAsync(CreateRecipeStepRequest step, Guid organizationId, Guid createdBy)
        {
            try {

            // Get the max step number for this recipe
            var recipe = await _context.RecipeDetails
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.ExternalId == step.RecipeExternalId && r.OrganizationId == organizationId);
            
            if (recipe == null)
                return new RecipeStepDto();

            var maxStepNumber = await _context.RecipeSteps
                .Where(s => s.RecipeDetailId == recipe.Id && s.OrganizationId == organizationId && !s.IsDeleted)
                .MaxAsync(s => (int?)s.StepNumber) ?? 0;
            

            var _localUtc = DateTime.UtcNow;
            var newStep = new RecipeStep
            {
                StepNumber = maxStepNumber + 1,
                RecipeDetailId = recipe.Id,
                OrganizationId = organizationId,
                CreatedBy = createdBy,
                CreatedAt = _localUtc,
                UpdatedBy = createdBy,
                UpdatedAt = _localUtc,
                VersionNbr = 1,
                ExternalId = Guid.NewGuid(),
                StepInstructionText = step.StepInstructionText
            };


            _context.RecipeSteps.Add(newStep);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Recipe step {ExternalId} added to recipe {RecipeExternalId}", newStep.ExternalId, step.RecipeExternalId);
            return MapRecipeStepToDto(newStep);


            }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding recipe step to recipe {RecipeExternalId}", step.RecipeExternalId);
            throw;
        }
        }

        public async Task<RecipeStepDto?> UpdateStepAsync(Guid externalId, RecipeStep step, Guid organizationId, Guid updatedBy)
        {
            var existing = await _context.RecipeSteps.FirstOrDefaultAsync(s => s.ExternalId == externalId && s.OrganizationId == organizationId && !s.IsDeleted);
            if (existing == null) return null;
            existing.StepNumber = step.StepNumber;
            existing.StepInstructionText = step.StepInstructionText;
            existing.UpdatedBy = updatedBy;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.VersionNbr++;
            await _context.SaveChangesAsync();
            
            // Detach and reload without navigation properties
            _context.Entry(existing).State = EntityState.Detached;
            return MapRecipeStepToDto(existing);
        }

        public async Task<bool> DeleteStepAsync( Guid recipeStepExternalId, Guid organizationId, Guid deletedBy)
        {
            var step = await _context.RecipeSteps.FirstOrDefaultAsync(s => s.ExternalId == recipeStepExternalId && s.OrganizationId == organizationId && !s.IsDeleted);
            if (step == null) 
                return false;
            
            var _localUtc = DateTime.UtcNow;
            
            step.IsDeleted = true;
            step.UpdatedAt = _localUtc;
            step.UpdatedBy = deletedBy;
            step.VersionNbr++;
            await _context.SaveChangesAsync();
            return true;
        }
        private static RecipeStepDto MapRecipeStepToDto(RecipeStep step)
        {
            return new RecipeStepDto
            {
                ExternalId = step.ExternalId,
                RecipeDetailId = step.RecipeDetailId,
                IsDeleted = step.IsDeleted,
                StepNumber = step.StepNumber,
                StepInstructionText = step.StepInstructionText,
                CreatedAt = step.CreatedAt,
                CreatedBy = step.CreatedBy,
                UpdatedAt = step.UpdatedAt,
                UpdatedBy = step.UpdatedBy
            };
        }
    }
}

public class CreateRecipeStepRequest
{
    public Guid RecipeExternalId { get; set; } = Guid.Empty;
    public string? StepInstructionText { get; set; }
}

public class RecipeStepDto
{
    public Guid ExternalId { get; set; }  // UUID external ID (for APIs)
    public long RecipeDetailId { get; set; }  // BIGINT FK to recipe (recipe detail table)

    public bool IsDeleted { get; set; } = false;    
    public int StepNumber { get; set; } // The sequence number of the step
    public string? StepInstructionText { get; set; }  // The description of the step.
    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}