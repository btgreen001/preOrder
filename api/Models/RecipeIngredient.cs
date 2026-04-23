using System.ComponentModel.DataAnnotations.Schema;

namespace PreOrderApp.Models;

/// <summary>
/// Individual ingredients used in a recipe. Maps InventoryItems to RecipeDetails with quantity required.
/// Dual ID architecture: numeric id (PK for joins) + UUID external_id (for APIs)
/// </summary>
public class RecipeIngredient
{
    /// <summary>Numeric primary key for database joins (BIGINT GENERATED)</summary>
    public long Id { get; set; }

    /// <summary>UUID external ID for API/URL exposure (UNIQUE)</summary>
    public Guid ExternalId { get; set; } = Guid.NewGuid();

    /// <summary>Organization ID for multi-tenancy scoping</summary>
    public Guid OrganizationId { get; set; }

    /// <summary>Foreign key to RecipeDetail</summary>
    public long RecipeId { get; set; }

    /// <summary>Foreign key to InventoryItem (the ingredient); null if sourcing from a recipe component</summary>
    public long? InventoryItemId { get; set; }

    /// <summary>Foreign key to SellableProduct (recipe component source); null if sourcing from an inventory item</summary>
    public long? RecipeComponentProductId { get; set; }

    /// <summary>Quantity of ingredient required (e.g., 2.5 for 2.5 cups)</summary>
    public decimal QuantityRequired { get; set; }

    /// <summary>Unit of measure (e.g., "cups", "pounds", "teaspoons", "grams")</summary>
    public string Unit { get; set; } = "cups";

    /// <summary>Cost per unit at time of recipe creation (for costing calculations)</summary>
    public decimal CostPerUnit { get; set; }

    /// <summary>Purpose/use of ingredient to allow duplicates (e.g., "For dough", "For dusting")</summary>
    public string? PurposeText { get; set; }

    /// <summary>Display order within the ingredient list (0-based). Used for drag-and-drop reordering.</summary>
    //[Column("sequence_number")]
    public int? SequenceNumber { get; set; }

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

    /// <summary>
    /// Section name for display grouping (e.g., "Dough", "Filling", "Assembly and Production").
    /// NOTE: Auto-population logic is context-dependent in hierarchical recipes.
    /// - For sub-recipe ingredients: Typically inherits the composition's SectionName
    /// - For parent recipe ingredients: Defaults to "Assembly and Production"
    /// - Can be manually overridden for custom grouping
    /// "Master" is subjective in nested hierarchies; section assignment may need refinement.
    /// This property is NOT stored in the database - it's computed from recipe composition relationships.
    /// </summary>
    [NotMapped]
    public string? SectionName { get; set; }

    // Navigation properties
    public RecipeDetail? Recipe { get; set; }
    public InventoryItem? InventoryItem { get; set; }
    public SellableProduct? RecipeComponentProduct { get; set; }
    public Organization? Organization { get; set; }
}
