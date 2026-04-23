using PreOrderApp.Data;
using PreOrderApp.DTOs;
using PreOrderApp.Infrastructure;
using PreOrderApp.Models;
using Microsoft.EntityFrameworkCore;

namespace PreOrderApp.Services;

public interface IInventoryLotService
{
    Task<InventoryLotDto?> GetLotByExternalIdAsync(Guid externalId, Guid organizationId);
    Task<InventoryLotDto?> GetLotByIdAsync(long id, Guid organizationId);
    Task<List<InventoryLotListItemDto>> GetLotsByInventoryItemAsync(long inventoryItemId, Guid organizationId);
    Task<List<InventoryLotListItemDto>> GetAllLotsAsync(Guid organizationId, int pageNumber = 1, int pageSize = 20);
    Task<InventoryLotDto> CreateLotAsync(CreateInventoryLotDto dto, Guid organizationId, Guid createdBy);
    Task<InventoryLotDto> UpdateLotAsync(Guid externalId, UpdateInventoryLotDto dto, Guid organizationId, Guid updatedBy);
    Task DeleteLotAsync(Guid externalId, Guid organizationId);
}

public class InventoryLotService : IInventoryLotService
{
    private readonly AppDbContext _context;
    private readonly ILogger<InventoryLotService> _logger;

        public InventoryLotService(AppDbContext context, ILogger<InventoryLotService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<InventoryLotDto?> GetLotByExternalIdAsync(Guid externalId, Guid organizationId)
    {
        var lot = await _context.InventoryLots
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.ExternalId == externalId && l.OrganizationId == organizationId);

        return lot == null ? null : MapToDto(lot);
    }

    public async Task<InventoryLotDto?> GetLotByIdAsync(long id, Guid organizationId)
    {
        var lot = await _context.InventoryLots
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == id && l.OrganizationId == organizationId);

        return lot == null ? null : MapToDto(lot);
    }

    public async Task<List<InventoryLotListItemDto>> GetLotsByInventoryItemAsync(long inventoryItemId, Guid organizationId)
    {
        var lots = await _context.InventoryLots
            .AsNoTracking()
            .Where(l => l.InventoryItemId == inventoryItemId && l.OrganizationId == organizationId)
            .OrderByDescending(l => l.ReceivedDate)
            .Select(l => new InventoryLotListItemDto(
                l.ExternalId,
                l.InventoryItemId,
                l.InventoryItem!.Name,
                l.InboundFlg,
                l.ExpectedQuantity,
                l.ActualQuantity,
                l.DiscrepancyReason,
                l.ReceivedDate,
                l.CreatedAt
            ))
            .ToListAsync();

        return lots;
    }

    public async Task<List<InventoryLotListItemDto>> GetAllLotsAsync(Guid organizationId, int pageNumber = 1, int pageSize = 20)
    {
        var skip = (pageNumber - 1) * pageSize;
        var lots = await _context.InventoryLots
            .AsNoTracking()
            .Where(l => l.OrganizationId == organizationId)
            .OrderByDescending(l => l.CreatedAt)
            .Skip(skip)
            .Take(pageSize)
            .Select(l => new InventoryLotListItemDto(
                l.ExternalId,
                l.InventoryItemId,
                l.InventoryItem!.Name,
                l.InboundFlg,
                l.ExpectedQuantity,
                l.ActualQuantity,
                l.DiscrepancyReason,
                l.ReceivedDate,
                l.CreatedAt
            ))
            .ToListAsync();

        return lots;
    }

    public async Task<InventoryLotDto> CreateLotAsync(CreateInventoryLotDto dto, Guid organizationId, Guid createdBy)
    {
        // Verify inventory item exists and belongs to organization
        var item = await _context.InventoryItems
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == dto.InventoryItemId && i.OrganizationId == organizationId);
        
        if (item == null)
            throw new ArgumentException($"Inventory item {dto.InventoryItemId} not found");

        var lot = new InventoryLot
        {
            ExternalId = Guid.NewGuid(),
            OrganizationId = organizationId,
            InventoryItemId = dto.InventoryItemId,
            PoId = dto.PoId,
            InboundFlg = dto.InboundFlg,
            ExpectedQuantity = dto.ExpectedQuantity,
            ExpectedUnitOfMeasure = dto.ExpectedUnitOfMeasure,
            ActualQuantity = dto.ActualQuantity ?? dto.ExpectedQuantity,
            ActualUnitOfMeasure = dto.ActualUnitOfMeasure ?? dto.ExpectedUnitOfMeasure,
            DiscrepancyReason = dto.DiscrepancyReason,
            ExpirationDate = dto.ExpirationDate,
            ReceivedDate = dto.ReceivedDate ?? DateTime.UtcNow,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow,
            UpdatedBy = createdBy,
            UpdatedAt = DateTime.UtcNow
        };

        _context.InventoryLots.Add(lot);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created inventory lot {LotId} for item {ItemId}", lot.ExternalId, dto.InventoryItemId);

        return MapToDto(lot);
    }

    public async Task<InventoryLotDto> UpdateLotAsync(Guid externalId, UpdateInventoryLotDto dto, Guid organizationId, Guid updatedBy)
    {
        var lot = await _context.InventoryLots
            .FirstOrDefaultAsync(l => l.ExternalId == externalId && l.OrganizationId == organizationId);

        if (lot == null)
            throw new ArgumentException($"Lot {externalId} not found");

        // Use reusable optimistic locking extension
        await _context.UpdateWithVersionCheckAsync<InventoryLot>(
            lot,
            dto.VersionNbr,
            "InventoryLot",
            $"Lot {externalId}",
            l =>
            {
                l.ActualQuantity = dto.ActualQuantity;
                l.ActualUnitOfMeasure = dto.ActualUnitOfMeasure;
                l.DiscrepancyReason = dto.DiscrepancyReason;
                l.ExpirationDate = dto.ExpirationDate;
                l.ReceivedDate = dto.ReceivedDate;
                l.UpdatedBy = updatedBy;
                l.UpdatedAt = DateTime.UtcNow;
            },
            _logger);

        _logger.LogInformation("Updated inventory lot {LotId}", externalId);

        return MapToDto(lot);
    }

    public async Task DeleteLotAsync(Guid externalId, Guid organizationId)
    {
        var lot = await _context.InventoryLots
            .FirstOrDefaultAsync(l => l.ExternalId == externalId && l.OrganizationId == organizationId);

        if (lot == null)
            throw new ArgumentException($"Lot {externalId} not found");

        _context.InventoryLots.Remove(lot);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted inventory lot {LotId}", externalId);
    }

    private static InventoryLotDto MapToDto(InventoryLot lot)
    {
        return new InventoryLotDto(
            lot.ExternalId,
            lot.InventoryItemId,
            lot.PoId,
            lot.InboundFlg,
            lot.ExpectedQuantity,
            lot.ExpectedUnitOfMeasure,
            lot.ActualQuantity,
            lot.ActualUnitOfMeasure,
            lot.DiscrepancyReason,
            lot.ExpirationDate,
            lot.ReceivedDate,
            lot.CreatedAt,
            lot.CreatedBy,
            lot.UpdatedAt,
            lot.UpdatedBy,
            lot.VersionNbr
        );
    }
}
