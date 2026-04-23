namespace OrderMgmt.Models;

/// <summary>
/// Production tasks for managing workflow from recipe through batch completion.
/// Tracks task status, staff assignment, and timing for production planning.
/// Dual ID architecture: numeric id (PK for joins) + UUID external_id (for APIs)
/// </summary>
public class ProductionTask
{
    /// <summary>Numeric primary key for database joins (BIGINT GENERATED)</summary>
    public long Id { get; set; }

    /// <summary>UUID external ID for API/URL exposure (UNIQUE)</summary>
    public Guid ExternalId { get; set; } = Guid.NewGuid();

    /// <summary>Organization ID for multi-tenancy scoping</summary>
    public Guid OrganizationId { get; set; }

    /// <summary>Foreign key to RecipeDetail (recipe for this task)</summary>
    public long RecipeId { get; set; }

    /// <summary>Foreign key to SellableProduct (what to produce)</summary>
    public long ProductId { get; set; }

    /// <summary>Foreign key to FinishedGoodsBatch (batch created from this task)</summary>
    public long? BatchId { get; set; }

    /// <summary>Quantity to produce in this task</summary>
    public int QuantityToProduce { get; set; }

    /// <summary>Staff member assigned to this task (PIN user ID or name)</summary>
    public string? AssignedStaffId { get; set; }

    /// <summary>Current task status: Pending, In Progress, Completed, Cancelled</summary>
    public string TaskStatus { get; set; } = "Pending";

    /// <summary>When the task started</summary>
    public DateTime? StartTime { get; set; }

    /// <summary>When the task is expected to be completed</summary>
    public DateTime? ExpectedCompletion { get; set; }

    /// <summary>When the task was actually completed</summary>
    public DateTime? ActualCompletion { get; set; }

    /// <summary>Quality notes or issues encountered</summary>
    public string? QualityNotes { get; set; }

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
    public FinishedGoodsBatch? Batch { get; set; }
    public Organization? Organization { get; set; }
}
