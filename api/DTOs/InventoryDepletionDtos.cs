namespace PreOrderApp.DTOs;

/// <summary>
/// Depletion history record - tracks ingredient usage during production
/// </summary>
public record DepletionHistoryDto(
    string ExternalId,
    string BatchExternalId,
    string InventoryItemExternalId,
    long? InventoryItemId,
    DateTime DepletionDate,
    string DepletedBy,
    decimal DepletionCost,
    string Details
);

/// <summary>
/// Depletion summary - aggregate cost analysis
/// </summary>
public record DepletionSummaryDto(
    decimal TotalDepletionCost,
    int TotalBatches,
    decimal AverageCostPerBatch,
    List<string> TopProductsByClost
);

/// <summary>
/// Inventory alert - low stock, expiring soon, or expired items
/// </summary>
public record InventoryAlertDto(
    string InventoryItemExternalId,
    string ItemName,
    string AlertType, // LOW_STOCK, EXPIRING_SOON, EXPIRED
    string Message,
    int Metric // Days until expiration or quantity for low stock
);
