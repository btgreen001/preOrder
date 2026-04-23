using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using PreOrderApp.Models;

namespace PreOrderApp.Services
{
    public interface IRecipeStepService
    {
        Task<RecipeStepDto?> GetStepByExternalIdAsync(Guid recipeExternalId, Guid organizationId);
        Task<List<RecipeStepDto>> GetAllStepsByRecipeExternalIdAsync(Guid recipeExternalId, Guid organizationId);
        Task<List<RecipeStepDto>> GetStepsByRecipeExternalIdAsync(Guid recipeExternalId, Guid organizationId);

        Task<RecipeStepDto> CreateStepAsync(CreateRecipeStepRequest step, Guid organizationId, Guid createdBy);
        Task<RecipeStepDto?> UpdateStepAsync(Guid externalId, RecipeStep step, Guid organizationId, Guid updatedBy);
        Task<bool> DeleteStepAsync(Guid recipeStepExternalId, Guid organizationId, Guid deletedBy);
    }
}
