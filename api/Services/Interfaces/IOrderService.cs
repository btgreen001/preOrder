using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace PreOrderApp.Services.Interfaces
{
    public interface IOrderService
    {
        // Phase 1 - Basic CRUD Operations
        Task<List<OrderDto>> GetOrdersAsync(Guid organizationId);
        Task<OrderDetailDto?> GetOrderByIdAsync(Guid externalId, Guid organizationId);
        Task<OrderDetailDto> CreateOrderAsync(Guid organizationId, CreateOrderRequest request);
        Task<OrderDetailDto?> UpdateOrderAsync(Guid externalId, UpdateOrderRequest request);
        Task<bool> DeleteOrderAsync(Guid externalId);
        Task<OrderDetailDto?> UpdateOrderStatusAsync(Guid externalId, string newStatus);

        // Phase 2 - Business Logic
        Task<AvailabilityCheckResponse> ValidateOrderInventoryAsync(Guid organizationId, List<CreateOrderItemRequest> items);
        Task<AvailabilityCheckResponse> CheckAvailabilityAsync(Guid organizationId, Guid inventoryItemId, decimal quantity);
        Task<PickListDto> GeneratePickListAsync(Guid externalId, Guid organizationId);
        Task<OrderDetailDto?> CompleteOrderAsync(Guid externalId);
        Task<OrderDetailDto?> CancelOrderAsync(Guid externalId);
        Task<List<OrderDto>> GetOrdersByStatusAsync(Guid organizationId, string status);
    }

    public class OrderDto
    {
        public long Id { get; set; }
        public Guid ExternalId { get; set; }
        public long CustomerId { get; set; }
        public Guid? CustomerExternalId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string OrderStatus { get; set; } = string.Empty;
        public DateTime OrderDate { get; set; }
        public decimal TotalAmount { get; set; }
        public string? SpecialInstructionTxt { get; set; }
    }

    public class OrderDetailDto : OrderDto
    {
        public List<OrderItemDto>? Items { get; set; }
    }

    public class OrderItemDto
    {
        public long Id { get; set; }
        public Guid ExternalId { get; set; }
        public long SellableProductId { get; set; }
        public Guid? ProductExternalId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal LineTotal { get; set; }
        public string? Customizations { get; set; }
    }

    public class CreateOrderRequest
    {
        public Guid? CustomerExternalId { get; set; } // Null means use walk-in customer
        public string? SpecialInstructionTxt { get; set; }
        public List<CreateOrderItemRequest>? Items { get; set; }
    }

    public class CreateOrderItemRequest
    {
        public Guid SellableProductExternalId { get; set; }
        public decimal Quantity { get; set; }
        public string? Customizations { get; set; }
    }

    public class UpdateOrderRequest
    {
        public Guid? CustomerExternalId { get; set; } // Null means keep existing customer
        public string? SpecialInstructionTxt { get; set; }
        public int VersionNbr { get; set; }
    }

    public class UpdateOrderStatusRequest
    {
        public string? NewStatus { get; set; }
    }

    // Phase 2 DTOs
    public class AvailabilityCheckResponse
    {
        public bool AllItemsAvailable { get; set; }
        public List<ItemAvailability> Items { get; set; } = new();
        public string Message { get; set; } = string.Empty;
    }

    public class ItemAvailability
    {
        public long InventoryItemId { get; set; }
        public Guid InventoryExternalId { get; set; }
        public long ProductId { get; set; }
        public Guid ProductExternalId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public decimal RequestedQuantity { get; set; }
        public decimal AvailableQuantity { get; set; }
        public bool IsAvailable { get; set; }
    }

    public class PickListDto
    {
        public long OrderId { get; set; }
        public Guid OrderExternalId { get; set; }
        public string OrderNumber { get; set; } = string.Empty;
        public DateTime OrderDate { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public List<PickListItemDto> Items { get; set; } = new();
        public decimal TotalQuantity { get; set; }
        public string SpecialInstructions { get; set; } = string.Empty;
    }

    public class PickListItemDto
    {
        public long OrderItemId { get; set; }
        public Guid OrderItemExternalId { get; set; }
        public long InventoryItemId { get; set; }
        public Guid InventoryExternalId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string? Sku { get; set; }
        public decimal Quantity { get; set; }
        public string UnitOfMeasure { get; set; } = string.Empty;
        public string? WarehouseLocation { get; set; }
        public string? BatchNumber { get; set; }
        public DateTime? ExpirationDate { get; set; }
        public string? Customizations { get; set; }
    }
}
