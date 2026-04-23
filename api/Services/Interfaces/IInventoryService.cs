using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace PreOrderApp.Services.Interfaces
{
        public interface IInventoryService
        {
            /// <summary>
            /// Get composite inventory items (inventory + recipe components)
            /// </summary>
            Task<List<InventoryItemDto>> GetCompositeInventoryAsync(Guid organizationId);

            // Phase 1 - Basic Operations
            Task<List<InventoryItemDto>> GetAllItemsAsync(Guid organizationId);
            Task<List<InventoryCategoryDto>> GetItemCategoriesAsync(Guid organizationId);
            Task<List<ProductCategoryDto>> GetProductCategoriesAsync(Guid organizationId);
            Task<List<InventoryRecipeComponentDto>> GetRecipeComponentsAsync(Guid organizationId);
            Task<List<InventoryItemDto>> GetItemsBySupplierAsync(Guid organizationId, Guid supplierExternalId);
            Task<InventoryItemDto?> GetItemByIdAsync(Guid organizationId, Guid externalId);
            Task<InventoryItemDto> ReceiveGoodsAsync(Guid organizationId, ReceiveGoodsRequest request);
            Task<InventoryItemDto> UpdateItemAsync(Guid organizationId, Guid externalId, UpdateInventoryItemRequest request);
            Task<bool> DeleteItemAsync(Guid organizationId, Guid externalId);
            Task<InventoryMovementDto> AdjustQuantityAsync(Guid itemExternalId, InventoryAdjustmentRequest request);
            Task<List<InventoryMovementDto>> GetMovementsAsync(Guid organizationId, Guid itemExternalId);

            // Phase 2 - Business Logic
            Task<List<InventoryItemDto>> GetLowStockItemsAsync(Guid organizationId);
            Task<List<InventoryItemDto>> GetExpiringItemsAsync(Guid organizationId, int daysUntilExpiration = 7);
            Task<AvailabilityResponse> ReserveInventoryAsync(Guid itemExternalId, decimal quantity, string referenceId);
            Task<bool> FulfillInventoryAsync(Guid itemExternalId, decimal quantity, string referenceId);
            Task<bool> ReleaseReservationAsync(Guid itemExternalId, decimal quantity, string referenceId);
            Task<List<InventoryMovementDto>> GetMovementHistoryAsync(Guid itemExternalId, DateTime? startDate = null, DateTime? endDate = null);
            Task<InventorySummaryDto> GetSummaryAsync(Guid organizationId);
        
            // Availability Check - moved from Orders (Phase 2)
            Task<AvailabilityCheckResponse> CheckAvailabilityAsync(Guid organizationId, Guid inventoryItemExternalId, decimal quantity);
        }

    public class UpdateInventoryItemRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Sku { get; set; }
        public decimal QuantityOnHand { get; set; }
        public string UnitOfMeasure { get; set; } = "units";
        public decimal UnitCost { get; set; }
        public string? WarehouseLocation { get; set; }
        public string? BatchNumber { get; set; }
        public DateTime? ExpirationDate { get; set; }
        public decimal ReorderPoint { get; set; }
        public Guid? SupplierExternalId { get; set; }
        public long? CategoryId {get;set;}
    }

    public class InventoryItemDto
    {
        public long Id { get; set; }
        public Guid ExternalId { get; set; }
        public long? SupplierId { get; set; }
        public Guid? SupplierExternalId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Sku { get; set; }
        public decimal QuantityOnHand { get; set; }
        public decimal QuantityReserved { get; set; }
        public decimal QuantityAvailable => QuantityOnHand - QuantityReserved;
        public string UnitOfMeasure { get; set; } = string.Empty;
        public decimal UnitCost { get; set; }
        public string? BatchNumber { get; set; }
        public DateTime? ExpirationDate { get; set; }
        public long? CategoryId {get;set;}      
        // Frontend-facing fields (for UI compatibility)
        public decimal ReorderPoint { get; set; }
        public string? SupplierName { get; set; }
        public string? Description { get; set; }
        public string? Barcode { get; set; }
        public string? Location { get; set; }
        public DateTime? LastUpdated { get; set; }
    }

    public class ReceiveGoodsRequest
    {
        public Guid? SupplierExternalId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Sku { get; set; }
        public decimal Quantity { get; set; }
        public string UnitOfMeasure { get; set; } = "units";
        public decimal UnitCost { get; set; }
        public decimal ReorderPoint { get; set; }
        public string? WarehouseLocation { get; set; }
        public long? CategoryId {get;set;}
        public string? BatchNumber { get; set; }
        public DateTime? ExpirationDate { get; set; }
    }

    public class InventoryAdjustmentRequest
    {
        public decimal QuantityAdjustment { get; set; }
        public string? Reason { get; set; }
    }

    public class InventoryMovementDto
    {
        public long Id { get; set; }
        public Guid ExternalId { get; set; }
        public string MovementType { get; set; } = string.Empty;
        public decimal QuantityChange { get; set; }
        public string? Reason { get; set; }
        public string? ReferenceId { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class InventorySummaryDto
    {
        public int TotalItems { get; set; }
        public int LowStock { get; set; }
        public int ExpiringSoon { get; set; }
        public decimal TotalValue { get; set; }
        public int CategoriesCount { get; set; }
        public int SuppliersCount { get; set; }
    }

    public class InventoryCategoryDto
    {
        public long Id { get; set; }
        public Guid ExternalId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public string CategoryCode { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class ProductCategoryDto
    {
        public long Id { get; set; }
        public Guid ExternalId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public string CategoryCode { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class InventoryRecipeComponentDto
    {
        public Guid ExternalId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Sku { get; set; }
        public decimal QuantityOnHand { get; set; }
        public long? CategoryId { get; set; }
        public string Description { get; set; } = string.Empty;
        public string? OutputUnitMsr { get; set; }
        public decimal UnitCost { get; set; }
        public decimal UnitPrice { get; set; }
    }

    // Phase 2 DTOs
    public class AvailabilityResponse
    {
        public long InventoryItemId { get; set; }
        public Guid InventoryExternalId { get; set; }
        public bool IsAvailable { get; set; }
        public decimal RequestedQuantity { get; set; }
        public decimal AvailableQuantity { get; set; }
        public decimal ReservedQuantity { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class LowStockAlert
    {
        public long InventoryItemId { get; set; }
        public Guid InventoryExternalId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public decimal CurrentQuantity { get; set; }
        public decimal ReorderPoint { get; set; }
        public decimal ReorderQuantity { get; set; }
        public long? SupplierId { get; set; }
        public Guid? SupplierExternalId { get; set; }
        public DateTime? LastOrderDate { get; set; }
    }

    public class ExpiringItemAlert
    {
        public long InventoryItemId { get; set; }
        public Guid InventoryExternalId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public DateTime? ExpirationDate { get; set; }
        public int DaysUntilExpiration { get; set; }
        public decimal QuantityOnHand { get; set; }
        public string? BatchNumber { get; set; }
    }

    // Note: AvailabilityCheckResponse and ItemAvailability are defined in IOrderService.cs
    // and reused here for backwards compatibility
}
