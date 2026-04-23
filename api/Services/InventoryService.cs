using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PreOrderApp.Data;
using PreOrderApp.Models;
using PreOrderApp.Services.Interfaces;

namespace PreOrderApp.Services
{
    public class InventoryService : IInventoryService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<InventoryService> _logger;

        /// <summary>
        /// Get composite inventory items (inventory + recipe components)
        /// </summary>
        public async Task<List<InventoryItemDto>> GetCompositeInventoryAsync(Guid organizationId)
        {
            var inventoryItems = await GetAllItemsAsync(organizationId);
            var recipeComponents = await GetRecipeComponentsAsync(organizationId);

            // Map recipe components to InventoryItemDto (minimal fields)
            var mappedComponents = recipeComponents.Select(rc => new InventoryItemDto
            {
                Id = 0, // Not from inventory table
                ExternalId = rc.ExternalId,
                SupplierId = null,
                SupplierExternalId = null,
                Name = rc.Name,
                Sku = rc.Sku,
                QuantityOnHand = rc.QuantityOnHand,
                QuantityReserved = 0,
                UnitOfMeasure = rc.OutputUnitMsr ?? string.Empty,
                UnitCost = rc.UnitPrice,
                BatchNumber = null,
                ExpirationDate = null,
                CategoryId = rc.CategoryId, // Optionally set a special category
                ReorderPoint = 0, // Use 0 for non-nullable decimal
                SupplierName = null,
                Description = rc.Description,
                Barcode = rc.Sku,
                Location = null,
                LastUpdated = null
            });

            var composite = inventoryItems.Concat(mappedComponents)
                .OrderBy(item => item.Name)
                .ToList();
            return composite;
        }
        public InventoryService(AppDbContext context, ILogger<InventoryService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<InventoryItemDto>> GetAllItemsAsync(Guid organizationId)
        {
            _logger.LogDebug($"Getting all inventory items for organization {organizationId}");
            
            var items = await _context.InventoryItems
                .AsNoTracking()
                .Where(i => i.OrganizationId == organizationId && i.IsActive)
                .OrderBy(i => i.Name)
                .Select(i => new InventoryItemDto
                {
                    Id = i.Id,
                    ExternalId = i.ExternalId,
                    SupplierId = i.SupplierId,
                    SupplierExternalId = i.Supplier != null ? i.Supplier.ExternalId : null,
                    Name = i.Name,
                    Sku = i.Sku,
                    QuantityOnHand = i.QuantityOnHand,
                    QuantityReserved = i.QuantityReserved,
                    UnitOfMeasure = i.UnitOfMeasure,
                    UnitCost = i.UnitCost,
                    BatchNumber = i.BatchNumber,
                    ExpirationDate = i.ExpirationDate,
                    CategoryId = i.CategoryId,
                    ReorderPoint = i.ReorderPoint,
                    SupplierName = i.Supplier != null ? i.Supplier.Name : null,
                    Description = i.Description,
                    Barcode = i.Sku,
                    Location = i.WarehouseLocation,
                    LastUpdated = i.UpdatedAt
                })
                .ToListAsync();

            return items ?? new List<InventoryItemDto>();
        }

        public async Task<List<InventoryCategoryDto>> GetItemCategoriesAsync(Guid organizationId)
        {
            _logger.LogDebug($"Getting inventory categories for organization {organizationId}");

            var categories = await _context.ItemCategories
                .AsNoTracking()
                .Where(c => c.OrganizationId == organizationId && c.IsActive)
                .OrderBy(c => c.CategoryName)
                .Select(c => new InventoryCategoryDto
                {
                    Id = c.Id,
                    ExternalId = c.ExternalId,
                    CategoryName = c.CategoryName,
                    CategoryCode = c.CategoryCode,
                    Description = c.Description
                })
                .ToListAsync();

            return categories ?? new List<InventoryCategoryDto>();
        }


        public async Task<List<ProductCategoryDto>> GetProductCategoriesAsync(Guid organizationId)
        {
            _logger.LogDebug($"Getting product categories for organization {organizationId}");

            var categories = await _context.ProductCategories
                .AsNoTracking()
                .Where(c => c.OrganizationId == organizationId && c.IsActive)
                .OrderBy(c => c.CategoryName)
                .Select(c => new ProductCategoryDto
                {
                    Id = c.Id,
                    ExternalId = c.ExternalId,
                    CategoryName = c.CategoryName,
                    CategoryCode = c.CategoryCode,
                    Description = c.Description
                })
                .ToListAsync();

            return categories ?? new List<ProductCategoryDto>();
        }

        public async Task<List<InventoryRecipeComponentDto>> GetRecipeComponentsAsync(Guid organizationId)
        {
            _logger.LogDebug($"Getting recipe components for inventory list for organization {organizationId}");

            var components = await _context.SellableProducts
                .AsNoTracking()
                .Where(p => p.OrganizationId == organizationId && p.IsActive && p.IsRecipeComponent)
                .OrderBy(p => p.Name)
                .Select(p => new InventoryRecipeComponentDto
                {
                    ExternalId = p.ExternalId,
                    Name = p.Name,
                    Sku = p.Sku,
                    UnitPrice = p.UnitPrice,
                    OutputUnitMsr = p.OutputUnitMsr,
                    Description = p.Description ?? string.Empty,
                    QuantityOnHand = p.QuantityOnHand,
                    CategoryId = p.CategoryId

                })
                .ToListAsync();

            return components ?? new List<InventoryRecipeComponentDto>();
        }

        public async Task<List<InventoryItemDto>> GetItemsBySupplierAsync(Guid organizationId, Guid supplierExternalId)
        {
            // Phase 1: Returns all inventory items for the organization
            // TODO Phase 2: Implement supplier filtering through Recipe/ProductRecipe table
            var items = await _context.InventoryItems
                .AsNoTracking()
                .Where(i => i.OrganizationId == organizationId && i.IsActive && i.Supplier != null && i.Supplier.ExternalId == supplierExternalId)
                .Select(i => new InventoryItemDto
                {
                    Id = i.Id,
                    ExternalId = i.ExternalId,
                    SupplierId = i.SupplierId,
                    SupplierExternalId = i.Supplier != null ? i.Supplier.ExternalId : null,
                    Name = i.Name,
                    Sku = i.Sku,
                    QuantityOnHand = i.QuantityOnHand,
                    QuantityReserved = i.QuantityReserved,
                    UnitOfMeasure = i.UnitOfMeasure,
                    UnitCost = i.UnitCost,
                    BatchNumber = i.BatchNumber,
                    ExpirationDate = i.ExpirationDate,
                    CategoryId = i.CategoryId,
                    ReorderPoint = i.ReorderPoint,
                    SupplierName = i.Supplier != null ? i.Supplier.Name : null,
                    Description = i.Description,
                    Barcode = i.Sku,
                    Location = i.WarehouseLocation,
                    LastUpdated = i.UpdatedAt
                })
                .ToListAsync();

            return items ?? new List<InventoryItemDto>();
        }

        public async Task<InventoryItemDto?> GetItemByIdAsync(Guid organizationId, Guid externalId)
        {
            return await _context.InventoryItems
                .AsNoTracking()
                .Where(i => i.ExternalId == externalId && i.OrganizationId == organizationId && i.IsActive)
                .Select(i => new InventoryItemDto
                {
                    Id = i.Id,
                    ExternalId = i.ExternalId,
                    SupplierId = i.SupplierId,
                    SupplierExternalId = i.Supplier != null ? i.Supplier.ExternalId : null,
                    Name = i.Name,
                    Sku = i.Sku,
                    QuantityOnHand = i.QuantityOnHand,
                    QuantityReserved = i.QuantityReserved,
                    UnitOfMeasure = i.UnitOfMeasure,
                    UnitCost = i.UnitCost,
                    BatchNumber = i.BatchNumber,
                    ExpirationDate = i.ExpirationDate,
                    CategoryId = i.CategoryId,
                    ReorderPoint = i.ReorderPoint,
                    SupplierName = i.Supplier != null ? i.Supplier.Name : null,
                    Description = i.Description,
                    Barcode = i.Sku,
                    Location = i.WarehouseLocation,
                    LastUpdated = i.UpdatedAt
                })
                .FirstOrDefaultAsync();
        }

        public async Task<InventoryItemDto> ReceiveGoodsAsync(Guid organizationId, ReceiveGoodsRequest request)
        {
            _logger.LogInformation($"Receiving goods for organization {organizationId}");
            
            // Create inventory item (ingredient) - independent of products (sellable goods)
            var item = new InventoryItem
            {
                ExternalId = Guid.NewGuid(),
                OrganizationId = organizationId,
                Name = request.Name,
                Description = request.Description,
                Sku = request.Sku,
                QuantityOnHand = request.Quantity,
                QuantityReserved = 0,
                UnitOfMeasure = request.UnitOfMeasure,
                UnitCost = request.UnitCost,
                WarehouseLocation = request.WarehouseLocation,
                BatchNumber = request.BatchNumber,
                ExpirationDate = request.ExpirationDate,
                ReorderPoint = request.ReorderPoint,
                CategoryId = request.CategoryId,
                IsActive = true,
                LastReceivedAt = DateTime.UtcNow,
                LastUsedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                VersionNbr = 1
            };

            _context.InventoryItems.Add(item);

            // Create movement record
            var movement = new InventoryMovement
            {
                ExternalId = Guid.NewGuid(),
                OrganizationId = organizationId,
                InventoryItemId = item.Id,
                MovementType = "RECEIVED",
                QuantityChange = request.Quantity,
                Reason = $"Goods received - Batch: {request.BatchNumber}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                VersionNbr = 1
            };

            _context.InventoryMovements.Add(movement);
            await _context.SaveChangesAsync();

            return await GetItemByIdAsync(organizationId, item.ExternalId) ?? throw new InvalidOperationException("Failed to retrieve created item");
        }

        public async Task<InventoryItemDto> UpdateItemAsync(Guid organizationId, Guid externalId, UpdateInventoryItemRequest request)
        {
            var item = await _context.InventoryItems
                .FirstOrDefaultAsync(i => i.ExternalId == externalId && i.OrganizationId == organizationId && i.IsActive);

            if (item == null)
            {
                throw new InvalidOperationException($"Inventory item {externalId} not found");
            }

            if (request.SupplierExternalId.HasValue)
            {
                var supplier = await _context.Suppliers
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.ExternalId == request.SupplierExternalId.Value && s.OrganizationId == organizationId && s.IsActive);

                if (supplier == null)
                {
                    throw new InvalidOperationException($"Supplier {request.SupplierExternalId.Value} not found");
                }

                item.SupplierId = supplier.Id;
            }
            item.Name = request.Name;
            item.Description = request.Description;
            item.Sku = request.Sku;
            item.QuantityOnHand = request.QuantityOnHand;
            item.UnitOfMeasure = request.UnitOfMeasure;
            item.UnitCost = request.UnitCost;
            item.WarehouseLocation = request.WarehouseLocation;
            item.BatchNumber = request.BatchNumber;
            item.ExpirationDate = request.ExpirationDate;
            item.ReorderPoint = request.ReorderPoint;
            item.CategoryId = request.CategoryId;
            item.UpdatedAt = DateTime.UtcNow;
            item.VersionNbr += 1;

            await _context.SaveChangesAsync();

            return await GetItemByIdAsync(organizationId, externalId) ?? throw new InvalidOperationException("Failed to retrieve updated item");
        }

        public async Task<bool> DeleteItemAsync(Guid organizationId, Guid externalId)
        {
            var item = await _context.InventoryItems
                .FirstOrDefaultAsync(i => i.ExternalId == externalId && i.OrganizationId == organizationId && i.IsActive);

            if (item == null)
            {
                return false;
            }

            item.IsActive = false;
            item.UpdatedAt = DateTime.UtcNow;
            item.VersionNbr += 1;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<InventoryMovementDto> AdjustQuantityAsync(Guid inventoryItemExternalId, InventoryAdjustmentRequest request)
        {
            var item = await _context.InventoryItems.FirstOrDefaultAsync(i => i.ExternalId == inventoryItemExternalId);
            if (item == null)
                throw new InvalidOperationException($"Inventory item {inventoryItemExternalId} not found");

            item.QuantityOnHand += request.QuantityAdjustment;
            item.UpdatedAt = DateTime.UtcNow;

            var movement = new InventoryMovement
            {
                ExternalId = Guid.NewGuid(),
                OrganizationId = item.OrganizationId,
                InventoryItemId = item.Id,
                MovementType = "ADJUSTMENT",
                QuantityChange = request.QuantityAdjustment,
                Reason = request.Reason,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                VersionNbr = 1
            };

            _context.InventoryMovements.Add(movement);
            await _context.SaveChangesAsync();

            return new InventoryMovementDto
            {
                Id = movement.Id,
                ExternalId = movement.ExternalId,
                MovementType = movement.MovementType,
                QuantityChange = movement.QuantityChange,
                Reason = movement.Reason,
                CreatedAt = movement.CreatedAt
            };
        }

        public async Task<List<InventoryMovementDto>> GetMovementsAsync(Guid organizationId, Guid inventoryItemExternalId)
        {
            var item = await _context.InventoryItems
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.ExternalId == inventoryItemExternalId && i.OrganizationId == organizationId);
            if (item == null)
                return new List<InventoryMovementDto>();

            var movements = await _context.InventoryMovements
                .AsNoTracking()
                .Where(m => m.InventoryItemId == item.Id)
                .Select(m => new InventoryMovementDto
                {
                    Id = m.Id,
                    ExternalId = m.ExternalId,
                    MovementType = m.MovementType,
                    QuantityChange = m.QuantityChange,
                    Reason = m.Reason,
                    ReferenceId = m.ReferenceId,
                    CreatedAt = m.CreatedAt
                })
                .ToListAsync();

            return movements;
        }

        public async Task<List<InventoryMovementDto>> GetMovementHistoryAsync(Guid inventoryItemExternalId, DateTime? startDate = null, DateTime? endDate = null)
        {
            _logger.LogDebug($"Getting movement history for inventory {inventoryItemExternalId}");
            
            var item = await _context.InventoryItems.AsNoTracking().FirstOrDefaultAsync(i => i.ExternalId == inventoryItemExternalId);
            if (item == null)
                return new List<InventoryMovementDto>();

            var query = _context.InventoryMovements
                .Where(m => m.InventoryItemId == item.Id);

            if (startDate.HasValue)
                query = query.Where(m => m.CreatedAt >= startDate);

            if (endDate.HasValue)
                query = query.Where(m => m.CreatedAt <= endDate);

            var movements = await query
                .AsNoTracking()
                .OrderByDescending(m => m.CreatedAt)
                .Select(m => new InventoryMovementDto
                {
                    Id = m.Id,
                    ExternalId = m.ExternalId,
                    MovementType = m.MovementType,
                    QuantityChange = m.QuantityChange,
                    Reason = m.Reason,
                    CreatedAt = m.CreatedAt
                })
                .ToListAsync();

            return movements;
        }

        // ===== Phase 2: Business Logic Methods =====

        public async Task<List<InventoryItemDto>> GetLowStockItemsAsync(Guid organizationId)
        {
            _logger.LogDebug($"Getting low stock items for organization {organizationId}");
            
            var items = await _context.InventoryItems
                .AsNoTracking()
                .Where(i => i.OrganizationId == organizationId 
                    && i.IsActive 
                    && i.QuantityOnHand <= i.ReorderPoint)
                .GroupJoin(
                    _context.Suppliers,
                    inv => inv.SupplierId,
                    sup => sup.Id,
                    (inv, suppliers) => new { inv, suppliers }
                )
                .SelectMany(
                    x => x.suppliers.DefaultIfEmpty(),
                    (x, sup) => new InventoryItemDto
                    {
                        Id = x.inv.Id,
                        ExternalId = x.inv.ExternalId,
                        SupplierId = x.inv.SupplierId,
                        SupplierExternalId = sup != null ? sup.ExternalId : null,
                        Name = x.inv.Name,
                        Sku = x.inv.Sku,
                        QuantityOnHand = x.inv.QuantityOnHand,
                        QuantityReserved = x.inv.QuantityReserved,
                        UnitOfMeasure = x.inv.UnitOfMeasure,
                        UnitCost = x.inv.UnitCost,
                        BatchNumber = x.inv.BatchNumber,
                        ExpirationDate = x.inv.ExpirationDate,
                        ReorderPoint = x.inv.ReorderPoint,
                        SupplierName = sup != null ? sup.Name : "Unknown",
                        Location = x.inv.WarehouseLocation,
                        LastUpdated = x.inv.UpdatedAt
                    }
                )
                .ToListAsync();

            return items ?? new List<InventoryItemDto>();
        }

        public async Task<List<InventoryItemDto>> GetExpiringItemsAsync(Guid organizationId, int daysUntilExpiration = 7)
        {
            _logger.LogDebug($"Getting expiring items for organization {organizationId}");
            
            var expirationThreshold = DateTime.UtcNow.AddDays(daysUntilExpiration);
            
            var items = await _context.InventoryItems
                .AsNoTracking()
                .Where(i => i.OrganizationId == organizationId 
                    && i.IsActive 
                    && i.ExpirationDate.HasValue 
                    && i.ExpirationDate <= expirationThreshold)
                .GroupJoin(
                    _context.Suppliers,
                    inv => inv.SupplierId,
                    sup => sup.Id,
                    (inv, suppliers) => new { inv, suppliers }
                )
                .SelectMany(
                    x => x.suppliers.DefaultIfEmpty(),
                    (x, sup) => new InventoryItemDto
                    {
                        Id = x.inv.Id,
                        ExternalId = x.inv.ExternalId,
                        SupplierId = x.inv.SupplierId,
                        SupplierExternalId = sup != null ? sup.ExternalId : null,
                        Name = x.inv.Name,
                        Sku = x.inv.Sku,
                        QuantityOnHand = x.inv.QuantityOnHand,
                        QuantityReserved = x.inv.QuantityReserved,
                        UnitOfMeasure = x.inv.UnitOfMeasure,
                        UnitCost = x.inv.UnitCost,
                        BatchNumber = x.inv.BatchNumber,
                        ExpirationDate = x.inv.ExpirationDate,
                        ReorderPoint = x.inv.ReorderPoint,
                        SupplierName = sup != null ? sup.Name : "Unknown",
                        Location = x.inv.WarehouseLocation,
                        LastUpdated = x.inv.UpdatedAt
                    }
                )
                .ToListAsync();

            return items ?? new List<InventoryItemDto>();
        }

        public async Task<AvailabilityResponse> ReserveInventoryAsync(Guid inventoryItemExternalId, decimal quantity, string referenceId)
        {
            _logger.LogInformation($"Reserving {quantity} units of inventory {inventoryItemExternalId}");
            
            var item = await _context.InventoryItems.FirstOrDefaultAsync(i => i.ExternalId == inventoryItemExternalId);
            if (item == null)
                throw new InvalidOperationException($"Inventory item {inventoryItemExternalId} not found");

            var availableQuantity = item.QuantityOnHand - item.QuantityReserved;
            var isAvailable = availableQuantity >= quantity;

            if (isAvailable)
            {
                item.QuantityReserved += quantity;
                item.UpdatedAt = DateTime.UtcNow;

                var movement = new InventoryMovement
                {
                    ExternalId = Guid.NewGuid(),
                    OrganizationId = item.OrganizationId,
                    InventoryItemId = item.Id,
                    MovementType = "RESERVE",
                    QuantityChange = quantity,
                    Reason = "Inventory reserved for order",
                    ReferenceId = referenceId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    VersionNbr = 1
                };

                _context.InventoryMovements.Add(movement);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Successfully reserved {quantity} units");
            }
            else
            {
                _logger.LogWarning($"Insufficient inventory for reservation");
            }

            return new AvailabilityResponse
            {
                InventoryItemId = item.Id,
                InventoryExternalId = item.ExternalId,
                IsAvailable = isAvailable,
                RequestedQuantity = quantity,
                AvailableQuantity = availableQuantity,
                ReservedQuantity = item.QuantityReserved,
                Message = isAvailable 
                    ? $"Successfully reserved {quantity} units" 
                    : $"Insufficient stock. Requested: {quantity}, Available: {availableQuantity}"
            };
        }

        public async Task<bool> FulfillInventoryAsync(Guid inventoryItemExternalId, decimal quantity, string referenceId)
        {
            _logger.LogInformation($"Fulfilling {quantity} units of inventory {inventoryItemExternalId}");
            
            var item = await _context.InventoryItems.FirstOrDefaultAsync(i => i.ExternalId == inventoryItemExternalId);
            if (item == null)
                throw new InvalidOperationException($"Inventory item {inventoryItemExternalId} not found");

            if (item.QuantityReserved < quantity)
            {
                _logger.LogWarning($"Insufficient reserved inventory");
                return false;
            }

            item.QuantityReserved -= quantity;
            item.QuantityOnHand -= quantity;
            item.UpdatedAt = DateTime.UtcNow;

            var movement = new InventoryMovement
            {
                ExternalId = Guid.NewGuid(),
                OrganizationId = item.OrganizationId,
                InventoryItemId = item.Id,
                MovementType = "FULFILL",
                QuantityChange = -quantity,
                Reason = "Inventory fulfilled for order",
                ReferenceId = referenceId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                VersionNbr = 1
            };

            _context.InventoryMovements.Add(movement);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Successfully fulfilled {quantity} units");
            return true;
        }

        public async Task<bool> ReleaseReservationAsync(Guid inventoryItemExternalId, decimal quantity, string referenceId)
        {
            _logger.LogInformation($"Releasing {quantity} units of reserved inventory {inventoryItemExternalId}");
            
            var item = await _context.InventoryItems.FirstOrDefaultAsync(i => i.ExternalId == inventoryItemExternalId);
            if (item == null)
                throw new InvalidOperationException($"Inventory item {inventoryItemExternalId} not found");

            if (item.QuantityReserved < quantity)
            {
                _logger.LogWarning($"Insufficient reserved inventory to release");
                return false;
            }

            item.QuantityReserved -= quantity;
            item.UpdatedAt = DateTime.UtcNow;

            var movement = new InventoryMovement
            {
                ExternalId = Guid.NewGuid(),
                OrganizationId = item.OrganizationId,
                InventoryItemId = item.Id,
                MovementType = "RELEASE",
                QuantityChange = quantity,
                Reason = "Inventory reservation released",
                ReferenceId = referenceId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                VersionNbr = 1
            };

            _context.InventoryMovements.Add(movement);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Successfully released {quantity} units");
            return true;
        }

        public async Task<AvailabilityCheckResponse> CheckAvailabilityAsync(Guid organizationId, Guid inventoryItemExternalId, decimal quantity)
        {
            _logger.LogDebug($"Checking availability for inventory {inventoryItemExternalId}, quantity {quantity}");
            
            var item = await _context.InventoryItems.FirstOrDefaultAsync(i => i.ExternalId == inventoryItemExternalId && i.OrganizationId == organizationId);
            
            if (item == null)
            {
                return new AvailabilityCheckResponse
                {
                    AllItemsAvailable = false,
                    Message = $"Inventory item {inventoryItemExternalId} not found",
                    Items = new List<ItemAvailability>()
                };
            }

            var availableQuantity = item.QuantityOnHand - item.QuantityReserved;
            var isAvailable = availableQuantity >= quantity;

            return new AvailabilityCheckResponse
            {
                AllItemsAvailable = isAvailable,
                Items = new List<ItemAvailability>
                {
                    new()
                    {
                        InventoryItemId = item.Id,
                        InventoryExternalId = item.ExternalId,
                        ProductId = 0,
                        ProductExternalId = Guid.Empty,
                        ProductName = item.Name,
                        RequestedQuantity = quantity,
                        AvailableQuantity = availableQuantity,
                        IsAvailable = isAvailable
                    }
                },
                Message = isAvailable 
                    ? $"Item available: {availableQuantity} units" 
                    : $"Insufficient stock: {availableQuantity} available, {quantity} requested"
            };
        }

        public async Task<InventorySummaryDto> GetSummaryAsync(Guid organizationId)
        {
            var now = DateTime.UtcNow;
            var expiringSoonThreshold = now.AddDays(30);

            var items = _context.InventoryItems
                .AsNoTracking()
                .Where(i => i.OrganizationId == organizationId && i.IsActive);

            var totalItems = await items.CountAsync();
            var lowStock = await items.CountAsync(i => i.QuantityOnHand <= i.ReorderPoint);
            var expiringSoon = await items.CountAsync(i => i.ExpirationDate.HasValue && i.ExpirationDate.Value <= expiringSoonThreshold);
            var totalValue = await items.SumAsync(i => i.QuantityOnHand * i.UnitCost);
            var categoriesCount = await items
                .Where(i => !string.IsNullOrWhiteSpace(i.DefaultPurchaseUnitOfMeasure))
                .Select(i => i.DefaultPurchaseUnitOfMeasure)
                .Distinct()
                .CountAsync();
            var suppliersCount = await items
                .Where(i => i.SupplierId.HasValue)
                .Select(i => i.SupplierId)
                .Distinct()
                .CountAsync();

            return new InventorySummaryDto
            {
                TotalItems = totalItems,
                LowStock = lowStock,
                ExpiringSoon = expiringSoon,
                TotalValue = totalValue,
                CategoriesCount = categoriesCount,
                SuppliersCount = suppliersCount
            };
        }
    }
}
