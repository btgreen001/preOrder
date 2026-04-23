namespace OrderMgmt.DTOs;

/// <summary>
/// Recipe Step DTO for public API (NO cost data for security)
/// </summary>
public class RecipeStepDto
{
    public Guid ExternalId { get; set; }
    public Guid RecipeExternalId { get; set; }
    public int StepNumber { get; set; }
    public string StepInstructionText { get; set; } = string.Empty;
}

/// <summary>
/// Request to create a new recipe Step
/// </summary>
public class CreateRecipeStepRequest
{
    public string? RecipeExternalId { get; set; }
    public int StepNumber { get; set; }
    public string StepInstructionText { get; set; } = string.Empty;
}

/// <summary>
/// Request to update an existing recipe Step
/// </summary>
public class UpdateRecipeStepRequest
{
    public string? RecipeExternalId { get; set; }
    public int StepNumber { get; set; }
    public string StepInstructionText { get; set; } = string.Empty;
}
