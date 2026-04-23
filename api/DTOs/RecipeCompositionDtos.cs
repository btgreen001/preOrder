namespace OrderMgmt.DTOs;

/// <summary>
/// Recipe composition DTO for public API
/// </summary>
public class RecipeCompositionDto
{
    public Guid ExternalId { get; set; }
    public Guid ParentRecipeExternalId { get; set; }
    public string ParentRecipeName { get; set; } = string.Empty;
    
    // Composition type (TODO-1017 Phase 3): RECIPE or STEP
    public string CompositionType { get; set; } = "RECIPE";
    
    // For RECIPE type
    public Guid? SubRecipeExternalId { get; set; }
    public string? SubRecipeName { get; set; }
    public decimal? Quantity { get; set; }
    public string? Unit { get; set; }
    
    // For STEP type (TODO-1017 Phase 3)
    public string? StepText { get; set; }
    
    // Common fields
    public string SectionName { get; set; } = string.Empty;
    public int SequenceNumber { get; set; }
}

/// <summary>
/// Request to create a new recipe composition
/// </summary>
public class CreateRecipeCompositionRequest
{
    public Guid ParentRecipeExternalId { get; set; }
    
    // Composition type (TODO-1017 Phase 3): RECIPE or STEP
    public string CompositionType { get; set; } = "RECIPE";
    
    // For RECIPE type
    public Guid? SubRecipeExternalId { get; set; }
    public decimal? Quantity { get; set; } = 1;
    public string? Unit { get; set; } = "batch";
    
    // For STEP type (TODO-1017 Phase 3)
    public string? StepText { get; set; }
    
    // Common fields
    public string SectionName { get; set; } = string.Empty;
    public int SequenceNumber { get; set; }
}

/// <summary>
/// Request to update an existing recipe composition
/// </summary>
public class UpdateRecipeCompositionRequest
{
    // Type cannot be changed after creation
    
    // For RECIPE type (optional updates)
    public decimal? Quantity { get; set; }
    public string? Unit { get; set; }
    
    // For STEP type (optional update) - TODO-1017 Phase 3
    public string? StepText { get; set; }
    
    // Common fields (optional updates)
    public string? SectionName { get; set; }
    public int? SequenceNumber { get; set; }
    
    // Optimistic locking
    public int VersionNbr { get; set; }
}
