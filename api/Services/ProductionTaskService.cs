using PreOrderApp.Models;
using PreOrderApp.DTOs;
using PreOrderApp.Data;
using Microsoft.EntityFrameworkCore;

namespace PreOrderApp.Services;

/// <summary>
/// Service for production task management.
/// Tracks production tasks from creation through completion with staff assignment.
/// </summary>
public interface IProductionTaskService
{
    Task<ProductionTaskDto> CreateTaskAsync(CreateProductionTaskRequest request, Guid organizationId, string createdBy);
    Task<List<ProductionTaskDto>> GetTasksAsync(Guid organizationId, string? status = null, int pageNumber = 1, int pageSize = 25);
    Task<ProductionTaskDto?> GetTaskByExternalIdAsync(Guid externalId, Guid organizationId);
    Task<ProductionTaskDto?> UpdateTaskStatusAsync(Guid externalId, string newStatus, DateTime? actualCompletion, Guid organizationId, string updatedBy);
    Task<ProductionTaskDto?> AssignTaskAsync(Guid externalId, string staffId, Guid organizationId, string updatedBy);
}

public class ProductionTaskService : IProductionTaskService
{
        private readonly AppDbContext _context;
        private readonly ILogger<ProductionTaskService> _logger;

        public ProductionTaskService(AppDbContext context, ILogger<ProductionTaskService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ProductionTaskDto> CreateTaskAsync(CreateProductionTaskRequest request, Guid organizationId, string createdBy)
    {
        try
        {
            // Validate recipe and product exist
            var recipe = await _context.RecipeDetails
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.ExternalId == request.RecipeExternalId && r.OrganizationId == organizationId);
            
            var product = await _context.SellableProducts
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.ExternalId == request.ProductExternalId && p.OrganizationId == organizationId);

            if (recipe == null || product == null)
                throw new InvalidOperationException("Recipe or product not found");

            // Create task
            var task = new ProductionTask
            {
                ExternalId = Guid.NewGuid(),
                OrganizationId = organizationId,
                RecipeId = recipe.Id,
                ProductId = product.Id,
                QuantityToProduce = request.QuantityToProduce,
                ExpectedCompletion = request.ExpectedCompletion,
                TaskStatus = "Pending",
                CreatedBy = createdBy,
                CreatedAt = DateTime.UtcNow,
                UpdatedBy = createdBy,
                UpdatedAt = DateTime.UtcNow
            };

            _context.ProductionTasks.Add(task);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Created production task {task.ExternalId} for recipe {recipe.ExternalId}");
            return MapToDto(task);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error creating production task: {ex.Message}");
            throw;
        }
    }

    public async Task<List<ProductionTaskDto>> GetTasksAsync(Guid organizationId, string? status = null, int pageNumber = 1, int pageSize = 25)
    {
        try
        {
            var query = _context.ProductionTasks
                .Where(t => t.OrganizationId == organizationId)
                .AsNoTracking();

            if (!string.IsNullOrEmpty(status))
                query = query.Where(t => t.TaskStatus == status);

            var tasks = await query
                .OrderByDescending(t => t.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return tasks.Select(MapToDto).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting production tasks: {ex.Message}");
            throw;
        }
    }

    public async Task<ProductionTaskDto?> GetTaskByExternalIdAsync(Guid externalId, Guid organizationId)
    {
        try
        {
            var task = await _context.ProductionTasks
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.ExternalId == externalId && t.OrganizationId == organizationId);

            return task == null ? null : MapToDto(task);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error getting task {externalId}: {ex.Message}");
            throw;
        }
    }

    public async Task<ProductionTaskDto?> UpdateTaskStatusAsync(Guid externalId, string newStatus, DateTime? actualCompletion, Guid organizationId, string updatedBy)
    {
        try
        {
            var task = await _context.ProductionTasks
                .FirstOrDefaultAsync(t => t.ExternalId == externalId && t.OrganizationId == organizationId);

            if (task == null)
                return null;

            // Validate status transition
            if (!IsValidStatusTransition(task.TaskStatus, newStatus))
                throw new InvalidOperationException($"Cannot transition from {task.TaskStatus} to {newStatus}");

            task.TaskStatus = newStatus;
            if (actualCompletion.HasValue)
                task.ActualCompletion = actualCompletion;
            
            task.UpdatedBy = updatedBy;
            task.UpdatedAt = DateTime.UtcNow;
            task.VersionNbr++;

            await _context.SaveChangesAsync();
            _logger.LogInformation($"Updated task {externalId} status to {newStatus}");
            return MapToDto(task);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error updating task status: {ex.Message}");
            throw;
        }
    }

    public async Task<ProductionTaskDto?> AssignTaskAsync(Guid externalId, string staffId, Guid organizationId, string updatedBy)
    {
        try
        {
            var task = await _context.ProductionTasks
                .FirstOrDefaultAsync(t => t.ExternalId == externalId && t.OrganizationId == organizationId);

            if (task == null)
                return null;

            task.AssignedStaffId = staffId;
            task.UpdatedBy = updatedBy;
            task.UpdatedAt = DateTime.UtcNow;
            task.VersionNbr++;

            await _context.SaveChangesAsync();
            _logger.LogInformation($"Assigned task {externalId} to staff {staffId}");
            return MapToDto(task);
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error assigning task: {ex.Message}");
            throw;
        }
    }

    private bool IsValidStatusTransition(string currentStatus, string newStatus)
    {
        var validTransitions = new Dictionary<string, List<string>>
        {
            { "Pending", new List<string> { "In Progress", "Cancelled" } },
            { "In Progress", new List<string> { "Completed", "Cancelled" } },
            { "Completed", new List<string> { } },
            { "Cancelled", new List<string> { } }
        };

        return validTransitions.ContainsKey(currentStatus) && 
               validTransitions[currentStatus].Contains(newStatus);
    }

    private ProductionTaskDto MapToDto(ProductionTask task)
    {
        return new ProductionTaskDto(
            ExternalId: task.ExternalId,
            RecipeExternalId: task.Recipe?.ExternalId ?? Guid.Empty,
            ProductExternalId: task.Product?.ExternalId ?? Guid.Empty,
            QuantityToProduce: task.QuantityToProduce,
            AssignedStaffId: task.AssignedStaffId,
            TaskStatus: task.TaskStatus,
            StartTime: task.StartTime,
            ExpectedCompletion: task.ExpectedCompletion,
            ActualCompletion: task.ActualCompletion,
            QualityNotes: task.QualityNotes,
            CreatedAt: task.CreatedAt,
            UpdatedAt: task.UpdatedAt
        );
    }
}
