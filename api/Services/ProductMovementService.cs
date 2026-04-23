using OrderMgmt.Data;
using OrderMgmt.DTOs;
using OrderMgmt.Models;
using Microsoft.EntityFrameworkCore;

namespace OrderMgmt.Services;

public interface IProductMovementService
{
    Task<ProductMovementDto?> GetMovementByExternalIdAsync(Guid externalId, Guid organizationId);
    Task<List<ProductMovementListItemDto>> GetMovementsByProductAsync(long productId, Guid organizationId, string? movementType = null);
    Task<List<ProductMovementListItemDto>> GetMovementsByTypeAsync(string movementType, Guid organizationId, int pageNumber = 1, int pageSize = 20);
    Task<List<ProductMovementListItemDto>> GetAllMovementsAsync(Guid organizationId, int pageNumber = 1, int pageSize = 20);
    Task<ProductMovementSummaryDto[]> GetMovementSummaryAsync(Guid organizationId, DateTime? startDate = null, DateTime? endDate = null);
    Task<ProductMovementDto> RecordMovementAsync(CreateProductMovementDto dto, Guid organizationId, Guid createdBy);
    Task<ProductMovementDto> RecordReceivedAsync(long productId, decimal quantity, string unitOfMeasure, string? reason, string? referenceId, long? batchId, long? lotId, Guid organizationId, Guid createdBy);
    Task<ProductMovementDto> RecordSaleAsync(long productId, decimal quantity, string unitOfMeasure, string? referenceId, Guid organizationId, Guid createdBy);
    Task<ProductMovementDto> RecordWasteAsync(long productId, decimal quantity, string unitOfMeasure, string reason, string? referenceId, Guid organizationId, Guid createdBy);
    Task<ProductMovementDto> RecordAdjustmentAsync(long productId, decimal quantity, string unitOfMeasure, string reason, Guid organizationId, Guid createdBy);
}

public class ProductMovementService : IProductMovementService
{
    private readonly OrderMgmtDbContext _context;
    private readonly ILogger<ProductMovementService> _logger;

    public ProductMovementService(OrderMgmtDbContext context, ILogger<ProductMovementService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ProductMovementDto?> GetMovementByExternalIdAsync(Guid externalId, Guid organizationId)
    {
        var movement = await _context.ProductMovements
            .AsNoTracking()
            .Include(pm => pm.SellableProduct)
            .FirstOrDefaultAsync(pm => pm.ExternalId == externalId && pm.OrganizationId == organizationId);

        return movement == null ? null : MapToDto(movement);
    }

    public async Task<List<ProductMovementListItemDto>> GetMovementsByProductAsync(long productId, Guid organizationId, string? movementType = null)
    {
        var query = _context.ProductMovements
            .AsNoTracking()
            .Include(pm => pm.SellableProduct)
            .Where(pm => pm.SellableProductId == productId && pm.OrganizationId == organizationId);

        if (!string.IsNullOrEmpty(movementType))
            query = query.Where(pm => pm.MovementType == movementType);

        var movements = await query
            .OrderByDescending(pm => pm.MovementDate)
            .Select(pm => new ProductMovementListItemDto(
                pm.ExternalId,
                pm.SellableProductId,
                pm.SellableProduct!.Name,
                pm.MovementType,
                pm.Quantity,
                pm.UnitOfMeasure,
                pm.ReferenceId,
                pm.MovementDate,
                pm.CreatedAt
            ))
            .ToListAsync();

        return movements;
    }

    public async Task<List<ProductMovementListItemDto>> GetMovementsByTypeAsync(string movementType, Guid organizationId, int pageNumber = 1, int pageSize = 20)
    {
        var skip = (pageNumber - 1) * pageSize;
        var movements = await _context.ProductMovements
            .AsNoTracking()
            .Include(pm => pm.SellableProduct)
            .Where(pm => pm.MovementType == movementType && pm.OrganizationId == organizationId)
            .OrderByDescending(pm => pm.MovementDate)
            .Skip(skip)
            .Take(pageSize)
            .Select(pm => new ProductMovementListItemDto(
                pm.ExternalId,
                pm.SellableProductId,
                pm.SellableProduct!.Name,
                pm.MovementType,
                pm.Quantity,
                pm.UnitOfMeasure,
                pm.ReferenceId,
                pm.MovementDate,
                pm.CreatedAt
            ))
            .ToListAsync();

        return movements;
    }

    public async Task<List<ProductMovementListItemDto>> GetAllMovementsAsync(Guid organizationId, int pageNumber = 1, int pageSize = 20)
    {
        var skip = (pageNumber - 1) * pageSize;
        var movements = await _context.ProductMovements
            .AsNoTracking()
            .Include(pm => pm.SellableProduct)
            .Where(pm => pm.OrganizationId == organizationId)
            .OrderByDescending(pm => pm.MovementDate)
            .Skip(skip)
            .Take(pageSize)
            .Select(pm => new ProductMovementListItemDto(
                pm.ExternalId,
                pm.SellableProductId,
                pm.SellableProduct!.Name,
                pm.MovementType,
                pm.Quantity,
                pm.UnitOfMeasure,
                pm.ReferenceId,
                pm.MovementDate,
                pm.CreatedAt
            ))
            .ToListAsync();

        return movements;
    }

    public async Task<ProductMovementSummaryDto[]> GetMovementSummaryAsync(Guid organizationId, DateTime? startDate = null, DateTime? endDate = null)
    {
        var query = _context.ProductMovements
            .AsNoTracking()
            .Where(pm => pm.OrganizationId == organizationId);

        if (startDate.HasValue)
            query = query.Where(pm => pm.MovementDate >= startDate.Value);

        if (endDate.HasValue)
            query = query.Where(pm => pm.MovementDate <= endDate.Value);

        var summary = await query
            .GroupBy(pm => pm.MovementType)
            .Select(g => new ProductMovementSummaryDto(
                g.Key,
                g.Count(),
                g.Sum(pm => pm.Quantity),
                g.Min(pm => pm.MovementDate),
                g.Max(pm => pm.MovementDate)
            ))
            .ToArrayAsync();

        return summary;
    }

    public async Task<ProductMovementDto> RecordMovementAsync(CreateProductMovementDto dto, Guid organizationId, Guid createdBy)
    {
        // Verify product exists
        var product = await _context.SellableProducts
            .FirstOrDefaultAsync(p => p.Id == dto.SellableProductId && p.OrganizationId == organizationId);

        if (product == null)
            throw new ArgumentException($"Product {dto.SellableProductId} not found");

        var movement = new ProductMovement
        {
            ExternalId = Guid.NewGuid(),
            OrganizationId = organizationId,
            SellableProductId = dto.SellableProductId,
            MovementType = dto.MovementType,
            Quantity = dto.Quantity,
            UnitOfMeasure = dto.UnitOfMeasure,
            Reason = dto.Reason,
            ReferenceId = dto.ReferenceId,
            FinishedGoodsBatchId = dto.FinishedGoodsBatchId,
            InventoryLotId = dto.InventoryLotId,
            MovementDate = dto.MovementDate ?? DateTime.UtcNow,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow,
            UpdatedBy = createdBy,
            UpdatedAt = DateTime.UtcNow
        };

        _context.ProductMovements.Add(movement);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Recorded product movement {MovementId}: {Type} {Qty} {Unit}", 
            movement.ExternalId, movement.MovementType, movement.Quantity, movement.UnitOfMeasure);

        return MapToDto(movement);
    }

    public async Task<ProductMovementDto> RecordReceivedAsync(long productId, decimal quantity, string unitOfMeasure, string? reason, string? referenceId, long? batchId, long? lotId, Guid organizationId, Guid createdBy)
    {
        return await RecordMovementAsync(
            new CreateProductMovementDto(productId, "RECEIVED", quantity, unitOfMeasure, reason, referenceId, batchId, lotId, DateTime.UtcNow),
            organizationId,
            createdBy
        );
    }

    public async Task<ProductMovementDto> RecordSaleAsync(long productId, decimal quantity, string unitOfMeasure, string? referenceId, Guid organizationId, Guid createdBy)
    {
        return await RecordMovementAsync(
            new CreateProductMovementDto(productId, "SOLD", quantity, unitOfMeasure, "Customer order", referenceId, null, null, DateTime.UtcNow),
            organizationId,
            createdBy
        );
    }

    public async Task<ProductMovementDto> RecordWasteAsync(long productId, decimal quantity, string unitOfMeasure, string reason, string? referenceId, Guid organizationId, Guid createdBy)
    {
        return await RecordMovementAsync(
            new CreateProductMovementDto(productId, "WASTED", quantity, unitOfMeasure, reason, referenceId, null, null, DateTime.UtcNow),
            organizationId,
            createdBy
        );
    }

    public async Task<ProductMovementDto> RecordAdjustmentAsync(long productId, decimal quantity, string unitOfMeasure, string reason, Guid organizationId, Guid createdBy)
    {
        return await RecordMovementAsync(
            new CreateProductMovementDto(productId, "ADJUSTED", quantity, unitOfMeasure, reason, null, null, null, DateTime.UtcNow),
            organizationId,
            createdBy
        );
    }

    private static ProductMovementDto MapToDto(ProductMovement movement)
    {
        return new ProductMovementDto(
            movement.ExternalId,
            movement.SellableProductId,
            movement.SellableProduct?.Name ?? "Unknown",
            movement.MovementType,
            movement.Quantity,
            movement.UnitOfMeasure,
            movement.Reason,
            movement.ReferenceId,
            movement.FinishedGoodsBatchId,
            movement.InventoryLotId,
            movement.PoId,
            movement.MovementDate,
            movement.CreatedAt,
            movement.CreatedBy,
            movement.UpdatedAt,
            movement.UpdatedBy,
            movement.VersionNbr
        );
    }
}
