namespace PreOrderApp.Models;

/// <summary>
/// Recipe composition sections (e.g., dough, filling, frosting for a cake).
/// Allows recipes to have multiple sub-recipes or sections.
/// Dual ID architecture: numeric id (PK for joins) + UUID external_id (for APIs)
/// </summary>
public class RecipeComposition
{
    /// <summary>Numeric primary key for database joins (BIGINT GENERATED)</summary>
    public long Id { get; set; }

    /// <summary>UUID external ID for API/URL exposure (UNIQUE)</summary>
    public Guid ExternalId { get; set; } = Guid.NewGuid();

    /// <summary>Organization ID for multi-tenancy scoping</summary>
    public Guid OrganizationId { get; set; }

    /// <summary>Foreign key to parent RecipeDetail</summary>
    public long ParentRecipeId { get; set; }

    /// <summary>Foreign key to sub-recipe (another RecipeDetail) - nullable when type is STEP</summary>
    public long? SubRecipeId { get; set; }

    /// <summary>Type of composition: RECIPE (sub-recipe link) or STEP (inline instruction)</summary>
    public string CompositionType { get; set; } = string.Empty;

    /// <summary>Inline step text for STEP type (null for RECIPE type)</summary>
    public string? StepText { get; set; }

    /// <summary>Section name (e.g., "Dough", "Filling", "Frosting")</summary>
    public string SectionName { get; set; } = string.Empty;

    /// <summary>Sequence/order of this section in the recipe</summary>
    public int SequenceNumber { get; set; }

    /// <summary>Quantity of this section to make (e.g., 1 for single batch of filling)</summary>
    public decimal? Quantity { get; set; } = 1;

    /// <summary>Unit (e.g., "batch", "recipe", "portion")</summary>
    public string? Unit { get; set; } = "batch";

    /// <summary>Soft delete flag - true if logically deleted</summary>
    public bool IsDeleted { get; set; } = false;

    /// <summary>Audit: who created this record (User GUID)</summary>
    public Guid? CreatedBy { get; set; }

    /// <summary>Audit: when this record was created</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Audit: who last updated this record (User GUID)</summary>
    public Guid? UpdatedBy { get; set; }

    /// <summary>Audit: when this record was last updated</summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Audit: optimistic locking version number</summary>
    public int VersionNbr { get; set; } = 1;

    // Navigation properties
    public RecipeDetail? ParentRecipe { get; set; }
    public RecipeDetail? SubRecipe { get; set; }
    public Organization? Organization { get; set; }
}
