namespace OrderMgmt.Models;

public class RecipeStep
{
    public long Id { get; set; }  // BIGINT primary key (for joins)
    public Guid ExternalId { get; set; }  // UUID external ID (for APIs)
    public Guid OrganizationId { get; set; }
    public long RecipeDetailId { get; set; }  // BIGINT FK to recipe (recipe detail table)

    public bool IsDeleted { get; set; } = false;    
    public int StepNumber { get; set; } // The sequence number of the step
    public string? StepInstructionText { get; set; }  // The description of the step.
    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int VersionNbr { get; set; } = 1;
    
    public virtual Organization? Organization { get; set; }
    public virtual RecipeDetail? RecipeDetail { get; set; }
    
}

