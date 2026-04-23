namespace PreOrderApp.Models;

/// <summary>
/// Master template for common bakery ingredients. 
/// Used to auto-populate inventory when a new organization is created.
/// </summary>
public class IngredientTemplate
{
    public long IngredientTemplateId { get; set; }
    
    public string Name { get; set; } = string.Empty;
    public string? Sku { get; set; }
    public string? Category { get; set; }
    public string UnitOfMeasure { get; set; } = "lb";
    public decimal? TypicalUnitCost { get; set; }
    
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
