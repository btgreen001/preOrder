namespace OrderMgmt.DTOs;

/// <summary>
/// Production task response DTO.
/// </summary>
public record ProductionTaskDto(
    Guid ExternalId,
    Guid RecipeExternalId,
    Guid ProductExternalId,
    int QuantityToProduce,
    string? AssignedStaffId,
    string TaskStatus,
    DateTime? StartTime,
    DateTime? ExpectedCompletion,
    DateTime? ActualCompletion,
    string? QualityNotes,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

/// <summary>
/// Create production task request.
/// </summary>
public record CreateProductionTaskRequest(
    Guid RecipeExternalId,
    Guid ProductExternalId,
    int QuantityToProduce,
    DateTime? ExpectedCompletion
);

/// <summary>
/// Update production task status request.
/// </summary>
public record UpdateTaskStatusRequest(
    string NewStatus,
    DateTime? ActualCompletion,
    string? QualityNotes
);

/// <summary>
/// Assign task to staff request.
/// </summary>
public record AssignTaskRequest(
    string StaffId
);

/// <summary>
/// Update production task request.
/// </summary>
public record UpdateProductionTaskRequest(
    int? QuantityToProduce,
    DateTime? ExpectedCompletion,
    string? QualityNotes
);
