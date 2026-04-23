namespace PreOrderApp.DTOs;

/// <summary>Create InventoryLot request DTO</summary>
public record CreateInventoryLotDto(
    long InventoryItemId,
    long? PoId,
    bool InboundFlg,
    decimal ExpectedQuantity,
    string ExpectedUnitOfMeasure,
    decimal? ActualQuantity,
    string? ActualUnitOfMeasure,
    string? DiscrepancyReason,
    DateTime? ExpirationDate,
    DateTime? ReceivedDate
);

/// <summary>Update InventoryLot request DTO</summary>
public record UpdateInventoryLotDto(
    decimal ActualQuantity,
    string ActualUnitOfMeasure,
    string? DiscrepancyReason,
    DateTime? ExpirationDate,
    DateTime? ReceivedDate,
    int VersionNbr
);

/// <summary>InventoryLot response DTO</summary>
public record InventoryLotDto(
    Guid ExternalId,
    long InventoryItemId,
    long? PoId,
    bool InboundFlg,
    decimal ExpectedQuantity,
    string ExpectedUnitOfMeasure,
    decimal ActualQuantity,
    string ActualUnitOfMeasure,
    string? DiscrepancyReason,
    DateTime? ExpirationDate,
    DateTime? ReceivedDate,
    DateTime CreatedAt,
    Guid? CreatedBy,
    DateTime UpdatedAt,
    Guid? UpdatedBy,
    int VersionNbr
);

/// <summary>InventoryLot list response DTO</summary>
public record InventoryLotListItemDto(
    Guid ExternalId,
    long InventoryItemId,
    string ItemName,
    bool InboundFlg,
    decimal ExpectedQuantity,
    decimal ActualQuantity,
    string? DiscrepancyReason,
    DateTime? ReceivedDate,
    DateTime CreatedAt
);
