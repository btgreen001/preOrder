using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderMgmt.DTOs;
using OrderMgmt.Services;
using OrderMgmt.Filters;
namespace OrderMgmt.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[ValidateTenantAccess]
public class ProductionDashboardController : ControllerBase
{
    private readonly IProductionDashboardService _dashboardService;
    private readonly ILogger<ProductionDashboardController> _logger;
    private readonly IOrganizationContextService _orgContext;

    public ProductionDashboardController(IProductionDashboardService dashboardService, ILogger<ProductionDashboardController> logger, IOrganizationContextService orgContext)
    {
        _dashboardService = dashboardService;
        _logger = logger;
        _orgContext = orgContext;
    }

    [HttpGet("today")]
    public async Task<ActionResult<DashboardMetricsDto>> GetTodayMetrics()
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var metrics = await _dashboardService.GetTodayMetricsAsync(orgId);
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting today metrics");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("upcoming-tasks")]
    public async Task<ActionResult<List<DashboardTaskCardDto>>> GetUpcomingTasks([FromQuery] int days = 7)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var tasks = await _dashboardService.GetUpcomingTasksAsync(orgId, days);
            return Ok(tasks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting upcoming tasks");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("productivity")]
    public async Task<ActionResult<ProductivityMetricsDto>> GetProductivityMetrics([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var start = startDate ?? DateTime.UtcNow.AddMonths(-1);
            var end = endDate ?? DateTime.UtcNow;
            
            var metrics = await _dashboardService.GetProductivityMetricsAsync(orgId, start, end);
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting productivity metrics");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("batch-trends")]
    public async Task<ActionResult<List<BatchTrendDto>>> GetBatchTrends([FromQuery] int days = 30)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var trends = await _dashboardService.GetBatchTrendsAsync(orgId, days);
            return Ok(trends);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting batch trends");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("alerts")]
    public async Task<ActionResult<DashboardAlertsSummaryDto>> GetAlerts()
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var alerts = await _dashboardService.GetAlertsAsync(orgId);
            return Ok(alerts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting alerts");
            return StatusCode(500, new { error = ex.Message });
        }
    }
}