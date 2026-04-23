namespace PreOrderApp.Models;

/// <summary>
/// Links recipes to sellable products (many-to-many). A product may have multiple recipes (variations),
/// and a recipe may be used for multiple products.
/// Dual ID architecture: numeric id (PK for joins) + UUID external_id (for APIs)
/// </summary>
public class RecipeProduct
{
    /// <summary>Numeric primary key for database joins (BIGINT GENERATED)</summary>
    public long Id { get; set; }

    /// <summary>UUID external ID for API/URL exposure (UNIQUE)</summary>
    public Guid ExternalId { get; set; } = Guid.NewGuid();

    /// <summary>Organization ID for multi-tenancy scoping</summary>
    public Guid OrganizationId { get; set; }

    /// <summary>Foreign key to RecipeDetail</summary>
    public long RecipeId { get; set; }

    /// <summary>Foreign key to SellableProduct</summary>
    public long ProductId { get; set; }

    /// <summary>Is this the primary/default recipe for this product?</summary>
    public bool IsPrimary { get; set; } = false;

    /// <summary>Recipe variation name (e.g., "Classic", "Organic", "Gluten-Free")</summary>
    public string? VariationName { get; set; }

    /// <summary>Notes about this recipe-product relationship</summary>
    public string? Notes { get; set; }

    /// <summary>Audit: who created this record</summary>
    public string CreatedBy { get; set; } = "system";

    /// <summary>Audit: when this record was created</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Audit: who last updated this record</summary>
    public string UpdatedBy { get; set; } = "system";

    /// <summary>Audit: when this record was last updated</summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Audit: optimistic locking version number</summary>
    public int VersionNbr { get; set; } = 1;

    // Navigation properties
    public RecipeDetail? Recipe { get; set; }
    public SellableProduct? Product { get; set; }
    public Organization? Organization { get; set; }
}
