namespace OrderMgmt.DTOs;

public class DashboardMetricsDto
{
    public int PendingTasksCount { get; set; }
    public int InProgressCount { get; set; }
    public int CompletedTodayCount { get; set; }
    public int AtRiskCount { get; set; }
    public string HealthStatus { get; set; } = string.Empty;
}

public class DashboardTaskCardDto
{
    public Guid TaskId { get; set; }
    public string RecipeName { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public int QuantityToProduce { get; set; }
    public DateTime ExpectedCompletion { get; set; }
    public int? DaysUntilDeadline { get; set; }
    public string Priority { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class ProductivityMetricsDto
{
    public decimal CompletionRate { get; set; }
    public decimal OnTimeRate { get; set; }
    public int AverageDurationMinutes { get; set; }
    public int TotalTasksCompleted { get; set; }
    public int TotalTasksScheduled { get; set; }
    public string PeakProductionHour { get; set; } = string.Empty;
}

public class BatchTrendDto
{
    public DateTime Date { get; set; }
    public int BatchesProduced { get; set; }
    public int TotalQuantity { get; set; }
    public decimal AverageCostPerUnit { get; set; }
    public decimal TotalProductionCost { get; set; }
}

public class DashboardAlertsSummaryDto
{
    public int LowStockItems { get; set; }
    public int ExpiringBatches { get; set; }
    public int ExpiredBatches { get; set; }
    public int OverdueTasks { get; set; }
    public int TotalAlerts { get; set; }
}

