namespace OrderMgmt.DTOs;

/// <summary>
/// Response DTO for recipe cost calculation.
/// </summary>
public record RecipeCostResponse(
    Guid RecipeExternalId,
    decimal TotalIngredientCost,
    int YieldServingCnt,
    string YieldUnit,
    decimal CostPerUnit
);

/// <summary>
/// Ingredient cost line for breakdown display.
/// </summary>
public class IngredientCostLine
{
    public Guid? InventoryItemExternalId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string Unit { get; set; } = string.Empty;
    // Cost snapshot captured on recipe/ingredient creation
    public decimal? CostPerUnit { get; set; }
    public decimal? TotalCost { get; set; }

    // Current inventory-based cost (may require unit conversion)
    public decimal? CurrentCostPerUnit { get; set; }
    public decimal? CurrentTotalCost { get; set; }
    public decimal? PercentageOfTotal { get; set; }
}

/// <summary>
/// Detailed recipe cost breakdown with all ingredients.
/// </summary>
public class RecipeCostBreakdownDto
{
    public Guid RecipeExternalId { get; set; }
    public string RecipeName { get; set; } = string.Empty;
    // Total/CostPerUnit in this response represent CURRENT inventory-based cost
    public decimal TotalCost { get; set; }
    public decimal CostPerUnit { get; set; }
    public int YieldServingCnt { get; set; }
    public string YieldUnit { get; set; } = string.Empty;
    public List<IngredientCostLine> IngredientLines { get; set; } = [];
}

/// <summary>
/// Request to calculate batch cost.
/// </summary>
public record CalculateBatchCostRequest(
    Guid RecipeExternalId,
    int QuantityProduced
);

/// <summary>
/// Request to create batch with automatic cost calculation.
/// </summary>
public record CreateBatchWithCostRequest(
    Guid RecipeExternalId,
    Guid ProductExternalId,
    int QuantityProduced,
    DateTime ProductionDate,
    DateTime ExpirationDate
);

/// <summary>
/// Response for batch cost calculation.
/// </summary>
public record BatchCostResponse(
    Guid BatchExternalId,
    decimal CostPerUnit,
    int QuantityProduced,
    decimal TotalBatchCost,
    string BatchNumber
);
