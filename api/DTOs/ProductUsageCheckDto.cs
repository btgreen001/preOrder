namespace PreOrderApp.DTOs;

/// <summary>
/// RECIPE(7) FIX: Response for checking if a product is used as a finished good in recipes.
/// Used when removing/changing product assignment on recipe editor to alert if it's the last one.
/// </summary>
public class ProductUsageCheckDto
{
    /// <summary>Total number of recipes using this product as their finished good</summary>
    public int TotalRecipeCount { get; set; }

    /// <summary>Number of ACTIVE recipes using this product (status = 'A')</summary>
    public int ActiveRecipeCount { get; set; }

    /// <summary>List of recipe details that use this product</summary>
    public List<RecipeUsageSummary> Recipes { get; set; } = new();

    /// <summary>True if this is the ONLY recipe producing this product; user should be warned</summary>
    public bool IsLastRecipeForProduct => TotalRecipeCount == 1;
}

/// <summary>
/// Summary of a recipe using a product
/// </summary>
public class RecipeUsageSummary
{
    public Guid ExternalId { get; set; }
    public string RecipeName { get; set; } = string.Empty;
    public char RecipeStatusCd { get; set; } // 'A' = active, 'D' = draft, 'B' = blocked
    public int RecipeVersionNbr { get; set; }
}
