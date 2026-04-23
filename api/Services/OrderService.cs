using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using PreOrderApp.Data;
using PreOrderApp.Models;
using PreOrderApp.Infrastructure;
using PreOrderApp.Services.Interfaces;

namespace PreOrderApp.Services
{
    public class OrderService : IOrderService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<OrderService> _logger;
        private readonly IInventoryService _inventoryService;

        public OrderService(AppDbContext context, ILogger<OrderService> logger, IInventoryService inventoryService)
        {
            _context = context;
            _logger = logger;
            _inventoryService = inventoryService;
        }

        public async Task<List<OrderDto>> GetOrdersAsync(Guid organizationId)
        {
            _logger.LogDebug($"Getting all orders for organization {organizationId}");
            
            var orders = await _context.Orders
                .AsNoTracking()
                .Where(o => o.OrganizationId == organizationId)
                .Include(o => o.Customer)
                .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.SellableProduct)
                .Select(o => new OrderDto
                {
                    Id = o.Id,
                    ExternalId = o.ExternalId,
                    CustomerId = o.CustomerId,
                    CustomerExternalId = o.Customer != null ? o.Customer.ExternalId : null,
                    CustomerName = o.Customer != null ? o.Customer.Name : string.Empty,
                    OrderStatus = o.OrderStatus,
                    OrderDate = o.OrderDate,
                    TotalAmount = o.TotalAmount,
                    SpecialInstructionTxt = o.SpecialInstructionTxt
                })
                .ToListAsync();

            return orders ?? new List<OrderDto>();
        }

        public async Task<OrderDetailDto?> GetOrderByIdAsync(Guid externalId, Guid organizationId)
        {
            _logger.LogDebug($"Getting order {externalId}");
            
            var order = await _context.Orders
                .Where(o => o.OrganizationId == organizationId)
                .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.SellableProduct)
                .Include(o => o.Customer)
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.ExternalId == externalId);

            if (order == null)
                return null;

            return MapToDetailDto(order);
        }

        public async Task<OrderDetailDto> CreateOrderAsync(Guid organizationId, CreateOrderRequest request)
        {
            _logger.LogInformation($"Creating order for organization {organizationId}");
            
            // Find or create customer
            Customer? customer;
            if (request.CustomerExternalId != null && request.CustomerExternalId != Guid.Empty)
            {
                customer = await _context.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.ExternalId == request.CustomerExternalId);
                if (customer == null)
                    throw new KeyNotFoundException($"Customer with ID {request.CustomerExternalId} not found");
            }
            else
            {
                // Use walk-in customer if no customer specified
                customer = await _context.Customers
                    .AsNoTracking()
                    .FirstOrDefaultAsync(c => c.OrganizationId == organizationId && c.Name == "Walk-In Customer");
                if (customer == null)
                    throw new KeyNotFoundException("Walk-in customer not found for organization");
            }
            
            var order = new Order
            {
                ExternalId = Guid.NewGuid(),
                OrganizationId = organizationId,
                CustomerId = customer.Id,
                OrderDate = DateTime.UtcNow,
                SpecialInstructionTxt = request.SpecialInstructionTxt,
                OrderStatus = "PENDING",
                TotalAmount = 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                VersionNbr = 1
            };

            // Add order items
            decimal totalAmount = 0;
            if (request.Items != null)
            {
                foreach (var item in request.Items)
                {
                    var product = await _context.SellableProducts.AsNoTracking().FirstOrDefaultAsync(p => p.ExternalId == item.SellableProductExternalId);
                    if (product != null)
                    {
                        var lineTotal = product.UnitPrice * (decimal)item.Quantity;
                        totalAmount += lineTotal;

                        order.OrderItems.Add(new OrderItem
                        {
                            ExternalId = Guid.NewGuid(),
                            OrderId = order.Id,
                            SellableProductId = product.Id,
                            Quantity = (int)item.Quantity,
                            UnitPrice = product.UnitPrice,
                            // NOTE: LineTotal removed - calculated value (UnitPrice × Quantity) not persisted in DB
                            Customizations = item.Customizations,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow,
                            VersionNbr = 1
                        });
                    }
                }
            }

            order.TotalAmount = totalAmount;
            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Order {order.ExternalId} created successfully");
            return MapToDetailDto(order);
        }

        public async Task<OrderDetailDto?> UpdateOrderAsync(Guid externalId, UpdateOrderRequest request)
        {
            var order = await _context.Orders
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.SellableProduct)
                .Include(o => o.Customer)
                .FirstOrDefaultAsync(o => o.ExternalId == externalId);
            
            if (order == null)
                return null;

            // Use reusable optimistic locking extension
            await _context.UpdateWithVersionCheckAsync<Order>(
                order,
                request.VersionNbr,
                "Order",
                $"Order #{order.Id}",
                async o =>
                {
                    if (request.CustomerExternalId != null && request.CustomerExternalId != Guid.Empty && request.CustomerExternalId != o.Customer?.ExternalId)
                    {
                        var customer = await _context.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.ExternalId == request.CustomerExternalId);
                        if (customer == null)
                            throw new KeyNotFoundException($"Customer with ID {request.CustomerExternalId} not found");
                        o.CustomerId = customer.Id;
                    }
                    
                    o.SpecialInstructionTxt = request.SpecialInstructionTxt ?? o.SpecialInstructionTxt;
                    o.UpdatedAt = DateTime.UtcNow;
                },
                _logger);

            return MapToDetailDto(order);
        }

        public async Task<bool> DeleteOrderAsync(Guid externalId)
        {
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.ExternalId == externalId);
            if (order == null)
                return false;

            order.OrderStatus = "CANCELLED";
            order.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<OrderDetailDto?> UpdateOrderStatusAsync(Guid externalId, string newStatus)
        {
            var order = await _context.Orders
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.SellableProduct)
                .Include(o => o.Customer)
                .FirstOrDefaultAsync(o => o.ExternalId == externalId);
            
            if (order == null)
                return null;

            order.OrderStatus = newStatus;
            order.UpdatedAt = DateTime.UtcNow;
            
            _logger.LogInformation($"Updating order {externalId} status to {newStatus}");
            
            await _context.SaveChangesAsync();
            return MapToDetailDto(order);
        }

        private OrderDetailDto MapToDetailDto(Order order)
        {
            return new OrderDetailDto
            {
                Id = order.Id,
                ExternalId = order.ExternalId,
                CustomerId = order.CustomerId,
                CustomerExternalId = order.Customer?.ExternalId,
                CustomerName = order.Customer?.Name ?? string.Empty,
                OrderStatus = order.OrderStatus,
                OrderDate = order.OrderDate,
                TotalAmount = order.TotalAmount,
                SpecialInstructionTxt = order.SpecialInstructionTxt,
                Items = order.OrderItems?.Select(oi => new OrderItemDto
                {
                    Id = oi.Id,
                    ExternalId = oi.ExternalId,
                    SellableProductId = oi.SellableProductId,
                    ProductExternalId = oi.SellableProduct?.ExternalId,
                    ProductName = oi.SellableProduct?.Name ?? "",
                    Quantity = oi.Quantity,
                    UnitPrice = oi.UnitPrice,
                    // NOTE: LineTotal calculated dynamically = UnitPrice × Quantity
                    LineTotal = oi.UnitPrice * oi.Quantity,
                    Customizations = oi.Customizations
                }).ToList() ?? new List<OrderItemDto>()
            };
        }

        // Phase 2 - Business Logic Methods

        public async Task<AvailabilityCheckResponse> ValidateOrderInventoryAsync(Guid organizationId, List<CreateOrderItemRequest> items)
        {
            _logger.LogInformation($"Validating inventory for {items.Count} order items");
            
            var response = new AvailabilityCheckResponse { AllItemsAvailable = true, Items = new() };

            // Group items by SellableProductExternalId to sum quantities per product
            var groupedItems = items.GroupBy(i => i.SellableProductExternalId).ToList();

            foreach (var productGroup in groupedItems)
            {
                var productExternalId = productGroup.Key;
                var totalRequestedQuantity = productGroup.Sum(i => i.Quantity);

                // Fetch the SellableProduct to check finished goods quantity_on_hand
                var product = await _context.SellableProducts
                    .AsNoTracking()
                    .FirstOrDefaultAsync(sp => sp.ExternalId == productExternalId && sp.OrganizationId == organizationId);


                if (product == null)
                {
                    //_logger.LogInformation($"Product query result for {productExternalId}: {(product != null ? product.Name : "NULL")}");
                    response.AllItemsAvailable = false;
                    foreach (var item in productGroup)
                    {
                        response.Items.Add(new ItemAvailability
                        {
                            ProductId = 0,
                            ProductExternalId = productExternalId,
                            ProductName = "Unknown Product",
                            RequestedQuantity = item.Quantity,
                            AvailableQuantity = 0,
                            IsAvailable = false
                        });
                    }
                    continue;
                }

                // Phase 2: Check finished goods inventory for this specific product
                // SellableProduct.QuantityOnHand represents available finished goods
                var isAvailable = product.QuantityOnHand >= totalRequestedQuantity;

                // Add each item from this product group to response with per-product availability
                foreach (var item in productGroup)
                {
                    response.Items.Add(new ItemAvailability
                    {
                        ProductId = product.Id,
                        ProductExternalId = product.ExternalId,
                        ProductName = product.Name,
                        RequestedQuantity = item.Quantity,
                        AvailableQuantity = product.QuantityOnHand,
                        IsAvailable = isAvailable
                    });
                }

                if (!isAvailable)
                    response.AllItemsAvailable = false;
            }

            response.Message = response.AllItemsAvailable 
                ? "All items available" 
                : "Some items not available";

            return response;
        }

        public async Task<AvailabilityCheckResponse> CheckAvailabilityAsync(Guid organizationId, Guid inventoryItemExternalId, decimal quantity)
        {
            // Delegate to InventoryService for backwards compatibility
            // This endpoint has moved to /api/inventory/check-availability
            _logger.LogWarning("OrderService.CheckAvailabilityAsync is deprecated. Use InventoryService.CheckAvailabilityAsync instead.");
            return await _inventoryService.CheckAvailabilityAsync(organizationId, inventoryItemExternalId, quantity);
        }

        public async Task<PickListDto> GeneratePickListAsync(Guid orderExternalId, Guid organizationId)
        {
            _logger.LogInformation($"Generating pick list for order {orderExternalId} in org {organizationId}");
            
            var order = await _context.Orders
                .Where(o => o.OrganizationId == organizationId)
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.SellableProduct)
                .Include(o => o.Customer)
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.ExternalId == orderExternalId);

            if (order == null)
                throw new KeyNotFoundException($"Order {orderExternalId} not found");

            var pickList = new PickListDto
            {
                OrderId = order.Id,
                OrderExternalId = order.ExternalId,
                OrderNumber = order.ExternalId.ToString().Substring(0, 8).ToUpper(),
                OrderDate = order.OrderDate,
                CustomerName = order.Customer?.Name ?? "Unknown",
                SpecialInstructions = order.SpecialInstructionTxt ?? "",
                Items = new(),
                TotalQuantity = 0
            };

            foreach (var orderItem in order.OrderItems)
            {
                var product = orderItem.SellableProduct;
                var pickListItem = new PickListItemDto
                {
                    OrderItemId = orderItem.Id,
                    OrderItemExternalId = orderItem.ExternalId,
                    ProductName = product?.Name ?? "Unknown",
                    Sku = product?.Sku,
                    Quantity = orderItem.Quantity,
                    UnitOfMeasure = string.IsNullOrWhiteSpace(product?.OutputUnitMsr) ? "units" : product!.OutputUnitMsr!,
                    Customizations = orderItem.Customizations
                };
                
                pickList.Items.Add(pickListItem);
                pickList.TotalQuantity += orderItem.Quantity;
            }

            return pickList;
        }

        public async Task<OrderDetailDto?> CompleteOrderAsync(Guid externalId)
        {
            _logger.LogInformation($"Completing order {externalId}");
            
            var order = await _context.Orders
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.SellableProduct)
                .Include(o => o.Customer)
                .FirstOrDefaultAsync(o => o.ExternalId == externalId);

            if (order == null)
                return null;

            order.OrderStatus = "COMPLETED";
            order.CompletedAt = DateTime.UtcNow;
            order.UpdatedAt = DateTime.UtcNow;

            // Update order items status
            foreach (var item in order.OrderItems)
            {
                item.OrderItemStatus = "FULFILLED";
                item.FulfilledQty = item.Quantity;
                item.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation($"Order {externalId} completed successfully");
            
            return MapToDetailDto(order);
        }

        public async Task<OrderDetailDto?> CancelOrderAsync(Guid externalId)
        {
            _logger.LogInformation($"Cancelling order {externalId}");
            
            var order = await _context.Orders
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.SellableProduct)
                .Include(o => o.Customer)
                .FirstOrDefaultAsync(o => o.ExternalId == externalId);

            if (order == null)
                return null;

            order.OrderStatus = "CANCELLED";
            order.CancelledAt = DateTime.UtcNow;
            order.UpdatedAt = DateTime.UtcNow;

            // Update order items status
            foreach (var item in order.OrderItems)
            {
                item.OrderItemStatus = "CANCELLED";
                item.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation($"Order {externalId} cancelled successfully");
            
            return MapToDetailDto(order);
        }

        public async Task<List<OrderDto>> GetOrdersByStatusAsync(Guid organizationId, string status)
        {
            _logger.LogDebug($"Getting orders with status '{status}' for organization {organizationId}");
            
            // Convert status to UPPERCASE to match database values (PENDING, PROCESSING, etc.)
            var statusUpper = status.ToUpper();
            
            var orders = await _context.Orders
                .Where(o => o.OrganizationId == organizationId && o.OrderStatus == statusUpper)
                .Include(o => o.Customer)
                .AsNoTracking()
                .Select(o => new OrderDto
                {
                    Id = o.Id,
                    ExternalId = o.ExternalId,
                    CustomerId = o.CustomerId,
                    CustomerExternalId = o.Customer != null ? o.Customer.ExternalId : null,
                    CustomerName = o.Customer != null ? o.Customer.Name : string.Empty,
                    OrderStatus = o.OrderStatus,
                    OrderDate = o.OrderDate,
                    TotalAmount = o.TotalAmount,
                    SpecialInstructionTxt = o.SpecialInstructionTxt
                })
                .ToListAsync();

            return orders ?? new List<OrderDto>();
        }
    }
}
