namespace PreOrderApp.Models;

/// <summary>
/// Master recipe for a finished product. Links ingredients to finished goods with portion/yield info and costing.
/// Dual ID architecture: numeric id (PK for joins) + UUID external_id (for APIs)
/// </summary>
public class RecipeDetail
{
    /// <summary>Numeric primary key for database joins (BIGINT GENERATED)</summary>
    public long Id { get; set; }

    /// <summary>UUID external ID for API/URL exposure (UNIQUE)</summary>
    public Guid ExternalId { get; set; } = Guid.NewGuid();

    /// <summary>Organization ID for multi-tenancy scoping</summary>
    public Guid OrganizationId { get; set; }

    /// <summary>Foreign key to SellableProduct (the finished product this recipe produces)</summary>
    public long? ProductId { get; set; }

    /// <summary>Recipe name/title (e.g., "Classic Sourdough")</summary>
    public string RecipeName { get; set; } = string.Empty;

    /// <summary>Recipe description and notes</summary>
    public string? Description { get; set; }

    /// <summary>Yield quantity (e.g., 24 for 24 cookies, 2 for 2 loaves)</summary>
    public int YieldServingCnt { get; set; }

    /// <summary>Yield serving unit (e.g., "pieces", "loaves", "pounds")</summary>
    public string YieldUnit { get; set; } = "pieces";

    /// <summary>Serving Size by Yield Unit measure (e.g., "50" grams for 1 serving)</summary>
    public decimal UnitsPerServing { get; set; }
    
    /// <summary>Cost per finished unit (calculated from ingredient costs and yield)</summary>
    public decimal? CostPerUnit { get; set; }

    // <summary>Whether this recipe is active/in use</summary>
    // public bool IsActive { get; set; } = true;
    // this was replaced by versioning and status code
 
    /// <summary>Whether this recipe is soft deleted</summary>
    public bool IsDeleted { get; set; } = false;

    // Timing metadata (NEW)
    /// <summary>Prep time in minutes</summary>
    public int? PrepTimeMin { get; set; }

    /// <summary>Active work time in minutes</summary>
    public int? ActiveTimeMin { get; set; }

    /// <summary>Bake time in minutes</summary>
    public int? CookTimeMin { get; set; }

    /// <summary>Rest/cooling time in minutes</summary>
    public int? RestTimeMin { get; set; }

    /// <summary>Inactive time in minutes (e.g., proofing)</summary>
    public int? InactiveTimeMin { get; set; }

    /// <summary>Total time in minutes</summary>
    public int? TotalTimeMin { get; set; }

    /// <summary>Expected shelf life in days after production (used for batch expiration calculation)</summary>
    public decimal ShelfLifeDayCnt { get; set; }

    // Versioning fields (DDL-aligned)
    /// <summary>Master recipe ID for version grouping (self-referencing FK)</summary>
    public long? MasterId { get; set; }

    /// <summary>Recipe version number for business versioning</summary>
    public int RecipeVersionNbr { get; set; } = 1;

    /// <summary>Recipe status code: D=draft, A=active, X=archived, P=pending-approval, B=abandoned</summary>
    public char RecipeStatusCd { get; set; } = 'D';

    /// <summary>Effective start date for this recipe version</summary>
    public DateTime? StartDt { get; set; }

    /// <summary>Effective end date for this recipe version</summary>
    public DateTime? EndDt { get; set; }

    /// <summary>User who approved this recipe version</summary>
    public Guid? ApprovedBy { get; set; }

    /// <summary>Timestamp when this recipe was approved</summary>
    public DateTime? ApprovedAt { get; set; }

    /// <summary>Audit: who created this record</summary>
    public Guid CreatedBy { get; set; } = Guid.Empty;

    /// <summary>Audit: when this record was created</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Audit: who last updated this record</summary>
    public Guid? UpdatedBy { get; set; } = Guid.Empty;

    /// <summary>Audit: when this record was last updated</summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Audit: optimistic locking version number</summary>
    public int VersionNbr { get; set; } = 1;

    // Navigation properties
    public SellableProduct? Product { get; set; }
    public Organization? Organization { get; set; }
    public RecipeDetail? MasterRecipe { get; set; }
    public ICollection<RecipeDetail> RecipeVersions { get; set; } = new List<RecipeDetail>();
    public ICollection<RecipeIngredient> Ingredients { get; set; } = new List<RecipeIngredient>();
    public ICollection<RecipeProduct> Products { get; set; } = new List<RecipeProduct>();

    public ICollection<RecipeComposition> Composition {get; set; } = new List<RecipeComposition>();
    public ICollection<RecipeStep> Steps { get; set; } = new List<RecipeStep>();


}
