using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using PreOrderApp.Services;
using PreOrderApp.DTOs;
using PreOrderApp.Models;
using PreOrderApp.Filters;
namespace PreOrderApp.Controllers;

/// <summary>
/// Production Task Management API
/// Handles task creation, status tracking, and staff assignment
/// Phase 3.3.1 Implementation
/// </summary>
[ApiController]
[Route("api/production-tasks")]
[Authorize]
[ValidateTenantAccess]
public class ProductionTasksController : ControllerBase
{
    private readonly IProductionTaskService _taskService;
    private readonly ILogger<ProductionTasksController> _logger;
    private readonly IOrganizationContextService _orgContext;

    public ProductionTasksController(IProductionTaskService taskService, ILogger<ProductionTasksController> logger, IOrganizationContextService orgContext)
    {
        _taskService = taskService;
        _logger = logger;
        _orgContext = orgContext;
    }

    /// <summary>
    /// Get all production tasks for organization
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IEnumerable<ProductionTaskDto>>> GetTasks(
        [FromQuery] string? status,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();

            var tasks = await _taskService.GetTasksAsync(orgId, status, pageNumber, pageSize);
            return Ok(tasks);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error retrieving production tasks: {ex.Message}");
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Get specific production task by external ID
    /// </summary>
    [HttpGet("{externalId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ProductionTaskDto>> GetTaskById(Guid externalId)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();

            var task = await _taskService.GetTaskByExternalIdAsync(externalId, orgId);
            if (task == null)
                return NotFound(new { error = $"Task {externalId} not found" });

            return Ok(task);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error retrieving production task {externalId}: {ex.Message}");
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Create new production task
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ProductionTaskDto>> CreateTask([FromBody] CreateProductionTaskRequest request)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var createdBy = _orgContext.GetCurrentUserId().ToString();

            var task = await _taskService.CreateTaskAsync(request, orgId, createdBy);

            return CreatedAtAction(nameof(GetTaskById), new { externalId = task.ExternalId }, task);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning($"Invalid request for create task: {ex.Message}");
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error creating production task: {ex.Message}");
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Update production task status
    /// </summary>
    [HttpPut("{externalId:guid}/status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ProductionTaskDto>> UpdateTaskStatus(
        Guid externalId,
        [FromBody] UpdateTaskStatusRequest request)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var updatedBy = _orgContext.GetCurrentUserId().ToString();

            var task = await _taskService.UpdateTaskStatusAsync(externalId, request.NewStatus, request.ActualCompletion, orgId, updatedBy);
            if (task == null)
                return NotFound(new { error = $"Task {externalId} not found" });

            return Ok(task);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning($"Invalid status update: {ex.Message}");
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error updating task status for {externalId}: {ex.Message}");
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Assign task to staff member
    /// </summary>
    [HttpPut("{externalId:guid}/assign")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ProductionTaskDto>> AssignTask(
        Guid externalId,
        [FromBody] AssignTaskRequest request)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var updatedBy = _orgContext.GetCurrentUserId().ToString();

            var task = await _taskService.AssignTaskAsync(externalId, request.StaffId, orgId, updatedBy);
            if (task == null)
                return NotFound(new { error = $"Task {externalId} not found" });

            return Ok(task);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error assigning task {externalId}: {ex.Message}");
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Update production task
    /// </summary>
    [HttpPut("{externalId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ProductionTaskDto>> UpdateTask(
        Guid externalId,
        [FromBody] UpdateProductionTaskRequest request)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            // Get current task
            var currentTask = await _taskService.GetTaskByExternalIdAsync(externalId, orgId);
            if (currentTask == null)
                return NotFound(new { error = $"Task {externalId} not found" });

            // Note: Field updates can be added here as needed for quantity and expected completion
            // This is a placeholder for future enhancements

            return Ok(currentTask);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error updating production task {externalId}: {ex.Message}");
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Delete production task (set inactive)
    /// </summary>
    [HttpDelete("{externalId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult> DeleteTask(Guid externalId)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var task = await _taskService.GetTaskByExternalIdAsync(externalId, orgId);
            if (task == null)
                return NotFound(new { error = $"Task {externalId} not found" });

            // Mark as cancelled (soft delete)
            var updatedBy = _orgContext.GetCurrentUserId().ToString();
            await _taskService.UpdateTaskStatusAsync(externalId, "Cancelled", null, orgId, updatedBy);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error deleting production task {externalId}: {ex.Message}");
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = ex.Message });
        }
    }
}
