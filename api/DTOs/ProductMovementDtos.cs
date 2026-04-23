namespace PreOrderApp.DTOs;

/// <summary>Create ProductMovement request DTO</summary>
public record CreateProductMovementDto(
    long SellableProductId,
    string MovementType,
    decimal Quantity,
    string UnitOfMeasure,
    string? Reason,
    string? ReferenceId,
    long? FinishedGoodsBatchId,
    long? InventoryLotId,
    DateTime? MovementDate
);

/// <summary>ProductMovement response DTO</summary>
public record ProductMovementDto(
    Guid ExternalId,
    long SellableProductId,
    string ProductName,
    string MovementType,
    decimal Quantity,
    string UnitOfMeasure,
    string? Reason,
    string? ReferenceId,
    long? FinishedGoodsBatchId,
    long? InventoryLotId,
    long? PoId,
    DateTime MovementDate,
    DateTime CreatedAt,
    Guid? CreatedBy,
    DateTime UpdatedAt,
    Guid? UpdatedBy,
    int VersionNbr
);

/// <summary>ProductMovement list response DTO</summary>
public record ProductMovementListItemDto(
    Guid ExternalId,
    long SellableProductId,
    string ProductName,
    string MovementType,
    decimal Quantity,
    string UnitOfMeasure,
    string? ReferenceId,
    DateTime MovementDate,
    DateTime CreatedAt
);

/// <summary>Product movement summary by type DTO</summary>
public record ProductMovementSummaryDto(
    string MovementType,
    int Count,
    decimal TotalQuantity,
    DateTime? FirstMovement,
    DateTime? LastMovement
);

/// <summary>Product movement history DTO for audit trail</summary>
public record ProductMovementHistoryDto(
    Guid ExternalId,
    long SellableProductId,
    string ProductName,
    string MovementType,
    decimal Quantity,
    string UnitOfMeasure,
    string? ReferenceId,
    DateTime MovementDate,
    Guid? CreatedBy,
    string CreatedByName
);
