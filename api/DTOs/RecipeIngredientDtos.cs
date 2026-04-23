namespace PreOrderApp.DTOs;

/// <summary>
/// Recipe ingredient DTO for public API (NO cost data for security).
/// Source is either an inventory item OR a recipe-component product — never both.
/// </summary>
public class RecipeIngredientDto
{
    public Guid ExternalId { get; set; }
    public Guid RecipeExternalId { get; set; }

    /// <summary>"inventory" or "recipe_component"</summary>
    public string SourceType { get; set; } = "inventory";

    // Populated when SourceType = "inventory"
    public Guid? InventoryItemExternalId { get; set; }
    public string? InventoryItemName { get; set; }
    public string? InventoryItemSku { get; set; }

    // Populated when SourceType = "recipe_component"
    public Guid? RecipeComponentProductExternalId { get; set; }
    public string? RecipeComponentProductName { get; set; }
    public string? RecipeComponentProductSku { get; set; }

    public decimal QuantityRequired { get; set; }
    public string Unit { get; set; } = string.Empty;
    public string? PurposeTxt { get; set; }
    public string? SectionName { get; set; }

    /// <summary>Display order within the ingredient list for drag-and-drop reordering.</summary>
    public int? SequenceNumber { get; set; }
}

/// <summary>
/// Recipe ingredient DTO with cost data — returned only to admin roles.
/// </summary>
public class RecipeIngredientWithCostDto : RecipeIngredientDto
{
    public decimal CostPerUnit { get; set; }
    public decimal TotalCost { get; set; }
}

/// <summary>
/// Request to create a new recipe ingredient.
/// Exactly one of InventoryItemExternalId or RecipeComponentProductExternalId must be provided.
/// </summary>
public class CreateRecipeIngredientRequest
{
    public string? RecipeExternalId { get; set; }

    /// <summary>Set for an inventory ingredient; mutually exclusive with RecipeComponentProductExternalId.</summary>
    public Guid? InventoryItemExternalId { get; set; }

    /// <summary>Set for a recipe-component ingredient; mutually exclusive with InventoryItemExternalId.</summary>
    public Guid? RecipeComponentProductExternalId { get; set; }

    public decimal QuantityRequired { get; set; }
    public string Unit { get; set; } = "cups";
    public string? PurposeTxt { get; set; }
    public decimal CostPerUnit { get; set; }

    // Section name (TODO-1017 Phase 3) - optional, auto-populated if null
    public string? SectionName { get; set; }
}

/// <summary>
/// Request to update an existing recipe ingredient
/// </summary>
public class UpdateRecipeIngredientRequest
{
    public decimal? QuantityRequired { get; set; }
    public string? Unit { get; set; }
    public string? PurposeTxt { get; set; }
    public decimal? CostPerUnit { get; set; }
    
    // Section name (TODO-1017 Phase 3) - optional
    public string? SectionName { get; set; }
    
    // Optimistic locking
    public int VersionNbr { get; set; }
}

/// <summary>
/// A single entry in a bulk ingredient reorder request.
/// </summary>
public class IngredientSequenceItem
{
    public Guid ExternalId { get; set; }
    public int SequenceNumber { get; set; }
}

/// <summary>
/// Request to reorder all ingredients for a recipe in one call.
/// </summary>
public class ReorderIngredientsRequest
{
    public List<IngredientSequenceItem> Sequences { get; set; } = new();
}
