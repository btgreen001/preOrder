using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using OrderMgmt.Data;
using OrderMgmt.DTOs;
using OrderMgmt.Models;

namespace OrderMgmt.Services;

public interface IProductionDashboardService
{
    Task<DashboardMetricsDto> GetTodayMetricsAsync(Guid organizationId);
    Task<List<DashboardTaskCardDto>> GetUpcomingTasksAsync(Guid organizationId, int days = 7);
    Task<ProductivityMetricsDto> GetProductivityMetricsAsync(Guid organizationId, DateTime startDate, DateTime endDate);
    Task<List<BatchTrendDto>> GetBatchTrendsAsync(Guid organizationId, int days = 30);
    Task<DashboardAlertsSummaryDto> GetAlertsAsync(Guid organizationId);
}

public class ProductionDashboardService : IProductionDashboardService
{
    private readonly OrderMgmtDbContext _context;
    private readonly ILogger<ProductionDashboardService> _logger;

    public ProductionDashboardService(OrderMgmtDbContext context, ILogger<ProductionDashboardService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<DashboardMetricsDto> GetTodayMetricsAsync(Guid organizationId)
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            var todayStart = today;
            var todayEnd = today.AddDays(1).AddTicks(-1);

            var pendingCount = await _context.ProductionTasks
                .Where(t => t.OrganizationId == organizationId && t.TaskStatus == "Pending")
                .CountAsync();

            var inProgressCount = await _context.ProductionTasks
                .Where(t => t.OrganizationId == organizationId && t.TaskStatus == "In Progress")
                .CountAsync();

            var completedToday = await _context.ProductionTasks
                .Where(t => t.OrganizationId == organizationId && 
                       t.TaskStatus == "Completed" && 
                       t.ActualCompletion >= todayStart && 
                       t.ActualCompletion <= todayEnd)
                .CountAsync();

            var atRiskCount = await _context.ProductionTasks
                .Where(t => t.OrganizationId == organizationId && 
                       t.TaskStatus == "In Progress" && 
                       t.ExpectedCompletion < DateTime.UtcNow)
                .CountAsync();

            return new DashboardMetricsDto
            {
                PendingTasksCount = pendingCount,
                InProgressCount = inProgressCount,
                CompletedTodayCount = completedToday,
                AtRiskCount = atRiskCount,
                HealthStatus = atRiskCount > 0 ? "WARNING" : "HEALTHY"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting today metrics for org {OrgId}", organizationId);
            throw;
        }
    }

    public async Task<List<DashboardTaskCardDto>> GetUpcomingTasksAsync(Guid organizationId, int days = 7)
    {
        try
        {
            var futureDate = DateTime.UtcNow.AddDays(days);

            var upcomingTasks = await _context.ProductionTasks
                .Where(t => t.OrganizationId == organizationId && 
                       t.TaskStatus == "Pending" && 
                       t.ExpectedCompletion <= futureDate)
                .Include(t => t.Recipe!)
                .Include(t => t.Product!)
                .OrderBy(t => t.ExpectedCompletion)
                .ToListAsync();

            var result = new List<DashboardTaskCardDto>();
            foreach (var task in upcomingTasks)
            {
                if (task.Recipe == null || task.Product == null) continue;

                var daysUntilDeadline = (int)((task.ExpectedCompletion ?? DateTime.UtcNow) - DateTime.UtcNow).TotalDays;
                var priority = daysUntilDeadline switch
                {
                    <= 0 => "URGENT",
                    <= 1 => "HIGH",
                    <= 3 => "MEDIUM",
                    _ => "LOW"
                };

                result.Add(new DashboardTaskCardDto
                {
                    TaskId = task.ExternalId,
                    RecipeName = task.Recipe.RecipeName,
                    ProductName = task.Product.Name,
                    QuantityToProduce = task.QuantityToProduce,
                    ExpectedCompletion = task.ExpectedCompletion ?? DateTime.UtcNow,
                    DaysUntilDeadline = daysUntilDeadline,
                    Priority = priority,
                    Status = task.TaskStatus
                });
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting upcoming tasks for org {OrgId}", organizationId);
            throw;
        }
    }

    public async Task<ProductivityMetricsDto> GetProductivityMetricsAsync(Guid organizationId, DateTime startDate, DateTime endDate)
    {
        try
        {
            var completedTasks = await _context.ProductionTasks
                .Where(t => t.OrganizationId == organizationId && 
                       t.TaskStatus == "Completed" && 
                       t.ActualCompletion >= startDate && 
                       t.ActualCompletion <= endDate)
                .ToListAsync();

            var totalTasks = await _context.ProductionTasks
                .Where(t => t.OrganizationId == organizationId && 
                       t.CreatedAt >= startDate && 
                       t.CreatedAt <= endDate)
                .CountAsync();

            var onTimeCount = completedTasks
                .Count(t => t.ActualCompletion <= t.ExpectedCompletion);

            var completionRate = totalTasks > 0 ? (decimal)completedTasks.Count / totalTasks * 100 : 0;
            var onTimeRate = completedTasks.Count > 0 ? (decimal)onTimeCount / completedTasks.Count * 100 : 0;

            var tasksWithDuration = completedTasks
                .Where(t => t.StartTime.HasValue && t.ActualCompletion.HasValue)
                .ToList();

            var avgDuration = tasksWithDuration.Count > 0
                ? (int)tasksWithDuration
                    .Average(t => (t.ActualCompletion!.Value - t.StartTime!.Value).TotalMinutes)
                : 0;

            return new ProductivityMetricsDto
            {
                CompletionRate = Math.Round(completionRate, 2),
                OnTimeRate = Math.Round(onTimeRate, 2),
                AverageDurationMinutes = avgDuration,
                TotalTasksCompleted = completedTasks.Count,
                TotalTasksScheduled = totalTasks,
                PeakProductionHour = "10:00 - 11:00" // Placeholder - would need time-based analysis
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting productivity metrics for org {OrgId}", organizationId);
            throw;
        }
    }

    public async Task<List<BatchTrendDto>> GetBatchTrendsAsync(Guid organizationId, int days = 30)
    {
        try
        {
            var startDate = DateTime.UtcNow.AddDays(-days);

            var trends = await _context.FinishedGoodsBatches
                .Where(b => b.OrganizationId == organizationId && b.CreatedAt >= startDate)
                .GroupBy(b => b.CreatedAt.Date)
                .Select(g => new BatchTrendDto
                {
                    Date = g.Key,
                    BatchesProduced = g.Count(),
                    TotalQuantity = g.Sum(b => b.QuantityProduced),
                    AverageCostPerUnit = g.Average(b => b.CostPerUnit),
                    TotalProductionCost = g.Sum(b => b.CostPerUnit * b.QuantityProduced)
                })
                .OrderBy(t => t.Date)
                .ToListAsync();

            return trends;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting batch trends for org {OrgId}", organizationId);
            throw;
        }
    }

    public async Task<DashboardAlertsSummaryDto> GetAlertsAsync(Guid organizationId)
    {
        try
        {
            var now = DateTime.UtcNow;
            var sevenDaysFromNow = now.AddDays(7);

            var lowStockAlerts = await _context.InventoryItems
                .Where(i => i.OrganizationId == organizationId && 
                       i.QuantityOnHand <= i.ReorderPoint)
                .CountAsync();

            var expiringAlerts = await _context.FinishedGoodsBatches
                .Where(b => b.OrganizationId == organizationId && 
                       b.Status == "Active" && 
                       b.ExpirationDate > now && 
                       b.ExpirationDate <= sevenDaysFromNow)
                .CountAsync();

            var expiredAlerts = await _context.FinishedGoodsBatches
                .Where(b => b.OrganizationId == organizationId && 
                       b.Status == "Active" && 
                       b.ExpirationDate <= now)
                .CountAsync();

            var overdueTasks = await _context.ProductionTasks
                .Where(t => t.OrganizationId == organizationId && 
                       t.TaskStatus != "Completed" && 
                       t.ExpectedCompletion < now)
                .CountAsync();

            return new DashboardAlertsSummaryDto
            {
                LowStockItems = lowStockAlerts,
                ExpiringBatches = expiringAlerts,
                ExpiredBatches = expiredAlerts,
                OverdueTasks = overdueTasks,
                TotalAlerts = lowStockAlerts + expiringAlerts + expiredAlerts + overdueTasks
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting alerts summary for org {OrgId}", organizationId);
            throw;
        }
    }
}
