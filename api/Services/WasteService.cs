using PreOrderApp.Models;
using PreOrderApp.Data;
using Microsoft.EntityFrameworkCore;

namespace PreOrderApp.Services;

public interface IWasteService
{
    Task<WasteEventDto?> GetWasteEventByExternalIdAsync(Guid externalId, Guid organizationId);
    Task<List<WasteEventDto>> GetWasteEventsAsync(Guid organizationId, string? reason = null, int? pageNumber = null, int? pageSize = null);
    Task<WasteAnalytics> GetWasteAnalyticsAsync(Guid organizationId, DateTime? startDate = null, DateTime? endDate = null);
    Task<WasteEventDto> LogWasteEventAsync(LogWasteEventRequest request, Guid organizationId, string recordedBy);
}

public class WasteService : IWasteService
{
    private readonly AppDbContext _context;
    private readonly ILogger<WasteService> _logger;

        public WasteService(AppDbContext context, ILogger<WasteService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<WasteEventDto?> GetWasteEventByExternalIdAsync(Guid externalId, Guid organizationId)
    {
        try
        {
            var wasteEvent = await _context.WasteEvents
                .AsNoTracking()
                .Where(w => w.ExternalId == externalId && w.OrganizationId == organizationId)
                .FirstOrDefaultAsync();

            if (wasteEvent == null)
                return null;

            return MapToDto(wasteEvent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting waste event {ExternalId}", externalId);
            throw;
        }
    }

    public async Task<List<WasteEventDto>> GetWasteEventsAsync(Guid organizationId, string? reason = null, int? pageNumber = null, int? pageSize = null)
    {
        try
        {
            var query = _context.WasteEvents
                .AsNoTracking()
                .Where(w => w.OrganizationId == organizationId);

            if (!string.IsNullOrEmpty(reason))
                query = query.Where(w => w.WasteReason == reason);

            if (pageNumber.HasValue && pageSize.HasValue)
            {
                var skip = (pageNumber.Value - 1) * pageSize.Value;
                query = query.Skip(skip).Take(pageSize.Value);
            }

            var wasteEvents = await query
                .OrderByDescending(w => w.RecordedAt)
                .ToListAsync();

            return wasteEvents.Select(MapToDto).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting waste events for organization {OrgId}", organizationId);
            throw;
        }
    }

    public async Task<WasteAnalytics> GetWasteAnalyticsAsync(Guid organizationId, DateTime? startDate = null, DateTime? endDate = null)
    {
        try
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var wasteEvents = await _context.WasteEvents
                .AsNoTracking()
                .Where(w => w.OrganizationId == organizationId
                    && w.RecordedAt >= start
                    && w.RecordedAt <= end)
                .ToListAsync();

            var totalCost = wasteEvents.Sum(w => w.WasteCost);
            var totalQuantity = wasteEvents.Sum(w => w.QuantityWasted);
            var eventCount = wasteEvents.Count;

            var reasonBreakdown = wasteEvents
                .GroupBy(w => w.WasteReason)
                .Select(g => new WasteReasonBreakdown
                {
                    Reason = g.Key,
                    Count = g.Count(),
                    TotalCost = g.Sum(w => w.WasteCost),
                    TotalQuantity = g.Sum(w => w.QuantityWasted)
                })
                .OrderByDescending(r => r.TotalCost)
                .ToList();

            return new WasteAnalytics
            {
                OrganizationId = organizationId,
                StartDate = start,
                EndDate = end,
                TotalWasteCost = totalCost,
                TotalWasteQuantity = totalQuantity,
                TotalWasteEvents = eventCount,
                AverageCostPerEvent = eventCount > 0 ? totalCost / eventCount : 0,
                ReasonBreakdown = reasonBreakdown
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting waste analytics for organization {OrgId}", organizationId);
            throw;
        }
    }

    public async Task<WasteEventDto> LogWasteEventAsync(LogWasteEventRequest request, Guid organizationId, string recordedBy)
    {
        try
        {
            var wasteEvent = new WasteEvent
            {
                ExternalId = Guid.NewGuid(),
                OrganizationId = organizationId,
                BatchId = request.BatchId,
                InventoryItemId = request.InventoryItemId,
                QuantityWasted = request.QuantityWasted,
                Unit = request.Unit ?? "pieces",
                WasteReason = request.WasteReason ?? "Other",
                WasteCost = request.WasteCost ?? 0,
                RecordedBy = recordedBy,
                RecordedAt = DateTime.UtcNow,
                Notes = request.Notes,
                CreatedBy = recordedBy,
                CreatedAt = DateTime.UtcNow,
                UpdatedBy = recordedBy,
                UpdatedAt = DateTime.UtcNow,
                VersionNbr = 1
            };

            _context.WasteEvents.Add(wasteEvent);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Waste event {ExternalId} logged for organization {OrgId}", wasteEvent.ExternalId, organizationId);
            return MapToDto(wasteEvent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging waste event");
            throw;
        }
    }

    private static WasteEventDto MapToDto(WasteEvent wasteEvent)
    {
        return new WasteEventDto
        {
            ExternalId = wasteEvent.ExternalId,
            BatchId = wasteEvent.BatchId,
            InventoryItemId = wasteEvent.InventoryItemId,
            QuantityWasted = wasteEvent.QuantityWasted,
            Unit = wasteEvent.Unit,
            WasteReason = wasteEvent.WasteReason,
            WasteCost = wasteEvent.WasteCost,
            RecordedBy = wasteEvent.RecordedBy,
            RecordedAt = wasteEvent.RecordedAt,
            Notes = wasteEvent.Notes,
            CreatedAt = wasteEvent.CreatedAt,
            CreatedBy = wasteEvent.CreatedBy
        };
    }
}

// DTOs
public class WasteEventDto
{
    public Guid ExternalId { get; set; }
    public long? BatchId { get; set; }
    public long? InventoryItemId { get; set; }
    public decimal QuantityWasted { get; set; }
    public string Unit { get; set; } = "pieces";
    public string WasteReason { get; set; } = "Other";
    public decimal WasteCost { get; set; }
    public string RecordedBy { get; set; } = string.Empty;
    public DateTime RecordedAt { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
}

public class LogWasteEventRequest
{
    public long? BatchId { get; set; }
    public long? InventoryItemId { get; set; }
    public decimal QuantityWasted { get; set; }
    public string? Unit { get; set; }
    public string? WasteReason { get; set; }
    public decimal? WasteCost { get; set; }
    public string? Notes { get; set; }
}

public class WasteAnalytics
{
    public Guid OrganizationId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal TotalWasteCost { get; set; }
    public decimal TotalWasteQuantity { get; set; }
    public int TotalWasteEvents { get; set; }
    public decimal AverageCostPerEvent { get; set; }
    public List<WasteReasonBreakdown> ReasonBreakdown { get; set; } = new();
}

public class WasteReasonBreakdown
{
    public string Reason { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal TotalCost { get; set; }
    public decimal TotalQuantity { get; set; }
}
