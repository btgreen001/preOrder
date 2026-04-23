namespace PreOrderApp.DTOs;

/// <summary>
/// DTO for batch information in FIFO order.
/// </summary>
public record FIFOBatchDto(
    Guid ExternalId,
    string BatchNumber,
    int QuantityAvailable,
    DateTime ProductionDate,
    DateTime ExpirationDate,
    decimal CostPerUnit,
    int DaysUntilExpiration,
    string ExpirationStatus
);

/// <summary>
/// DTO for batch selection in FIFO rotation.
/// </summary>
public record FIFOBatchSelectionDto(
    Guid BatchExternalId,
    string BatchNumber,
    int QuantitySelected,
    DateTime ExpirationDate,
    int DaysUntilExpiration,
    decimal CostPerUnit,
    decimal TotalCost
);

/// <summary>
/// DTO for batch expiration information.
/// </summary>
public record BatchExpirationInfoDto(
    Guid BatchExternalId,
    string BatchNumber,
    DateTime ExpirationDate,
    int DaysUntilExpiration,
    bool IsExpired,
    string ExpirationStatus,
    decimal PercentageTimeRemaining
);

/// <summary>
/// Request DTO for FIFO rotation.
/// </summary>
public record FIFORotationRequest(
    Guid ProductId,
    int QuantityNeeded
);

