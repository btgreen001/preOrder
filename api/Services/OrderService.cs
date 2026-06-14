using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Globalization;
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
                .Include(o => o.HolidayEvent)
                .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.MenuItem)
                .Select(o => new OrderDto
                {
                    Id = o.Id,
                    ExternalId = o.ExternalId,
                    CustomerId = o.CustomerId,
                    CustomerExternalId = o.Customer != null ? o.Customer.ExternalId : null,
                    EventToken = o.HolidayEvent != null ? o.HolidayEvent.ExternalId : null,
                    EventName = o.HolidayEvent != null ? o.HolidayEvent.Name : null,
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
                .Include(o => o.Organization)
                .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.MenuItem)
                .Include(o => o.Customer)
                .Include(o => o.HolidayEvent)
                .Include(o => o.PickupSlot)
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.ExternalId == externalId);

            if (order == null)
                return null;

            return MapToDetailDto(order);
        }


        public async Task<OrderDetailDto?> GetExternalOrderByIdAsync(Guid externalId)
        {
            _logger.LogDebug($"Getting order {externalId}");
            
            var order = await _context.Orders
                .Where(o => o.ExternalId == externalId)
                .Include(o => o.Organization)
                .Include(o => o.Customer)
                .Include(o => o.HolidayEvent)
                .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.MenuItem)
                .Include(o => o.PickupSlot)
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
                    var menuItem = await _context.MenuItems.AsNoTracking().FirstOrDefaultAsync(m => m.ExternalId == item.MenuItemExternalId);
                    if (menuItem != null)
                    {
                        var lineTotal = menuItem.Price * (decimal)item.Quantity;
                        totalAmount += lineTotal;

                        order.OrderItems.Add(new OrderItem
                        {
                            ExternalId = Guid.NewGuid(),
                            OrderId = order.Id,
                            MenuItemId = menuItem.Id,
                            Quantity = (int)item.Quantity,
                            UnitPrice = menuItem.Price,
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
                    .ThenInclude(oi => oi.MenuItem)
                .Include(o => o.Organization)
                .Include(o => o.Customer)
                .Include(o => o.PickupSlot)
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
                    .ThenInclude(oi => oi.MenuItem)
                .Include(o => o.Organization)
                .Include(o => o.Customer)
                .Include(o => o.PickupSlot)
                .FirstOrDefaultAsync(o => o.ExternalId == externalId);
            
            if (order == null)
                return null;

            order.OrderStatus = newStatus;
            order.UpdatedAt = DateTime.UtcNow;
            OrderSyncMilestoneAsync(order, newStatus);

            _logger.LogInformation($"Updating order {externalId} status to {newStatus}");
            
            await _context.SaveChangesAsync();
            return MapToDetailDto(order);
        }
        private void OrderSyncMilestoneAsync(Order order, string newStatus)
        {
            // Implement the logic for syncing the order milestone here
            order.CancelledAt = newStatus == "CANCELLED" ? DateTime.UtcNow : (DateTime?)null;
            order.CompletedAt = newStatus == "COMPLETED" || newStatus == "DELIVERED" ? DateTime.UtcNow : (DateTime?)null;
            
        }
        private OrderDetailDto MapToDetailDto(Order order)
        {
            return new OrderDetailDto
            {
                Id = order.Id,
                ExternalId = order.ExternalId,
                CustomerId = order.CustomerId,
                CustomerExternalId = order.Customer?.ExternalId,
                EventToken = order.HolidayEvent?.ExternalId,
                EventName = order.HolidayEvent?.Name,
                Organization = order.Organization == null ? null : new OrganizationSummaryDto
                {
                    OrganizationId = order.Organization.OrganizationId,
                    OrganizationName = order.Organization.OrganizationName,
                    RegistrationToken = order.Organization.RegistrationToken,
                    AddressLine1 = order.Organization.AddressLine1,
                    AddressLine2 = order.Organization.AddressLine2,
                    City = order.Organization.Locality,
                    State = order.Organization.Region,
                    PostalCode = order.Organization.PostalCode,
                    Country = order.Organization.CountryCode,
                    ContactEmail = order.Organization.PrimaryEmail,
                    ContactPhone = order.Organization.ContactPhone
                },
                CustomerName = order.Customer?.Name ?? string.Empty,
                OrderStatus = order.OrderStatus,
                OrderDate = order.OrderDate,
                TotalAmount = order.TotalAmount,
                SpecialInstructionTxt = order.SpecialInstructionTxt,
                PickupSlot = order.PickupSlot == null ? null : new PickupSlotSummaryDto
                {
                    Id = order.PickupSlot.Id,
                    ExternalId = order.PickupSlot.ExternalId,
                    SlotStartAt = order.PickupSlot.SlotStartAt,
                    SlotEndAt = order.PickupSlot.SlotEndAt
                },
                Items = order.OrderItems?.Select(oi => new OrderItemDto
                {
                    Id = oi.Id,
                    ExternalId = oi.ExternalId,
                    MenuItemId = oi.MenuItemId,
                    MenuItemExternalId = oi.MenuItem?.ExternalId,
                    MenuItemName = oi.MenuItem?.Name ?? "",
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

            // Group by menu item external id and resolve to the linked sellable product for stock checks.
            var groupedItems = items.GroupBy(i => i.MenuItemExternalId).ToList();

            foreach (var menuItemGroup in groupedItems)
            {
                var menuItemExternalId = menuItemGroup.Key;
                var totalRequestedQuantity = menuItemGroup.Sum(i => i.Quantity);

                var menuItem = await _context.MenuItems
                    .AsNoTracking()
                    .FirstOrDefaultAsync(m => m.ExternalId == menuItemExternalId && m.OrganizationId == organizationId);

                if (menuItem == null || !menuItem.SellableProductId.HasValue)
                {
                    response.AllItemsAvailable = false;
                    foreach (var item in menuItemGroup)
                    {
                        response.Items.Add(new ItemAvailability
                        {
                            ProductId = 0,
                            ProductExternalId = Guid.Empty,
                            ProductName = "Unknown Product",
                            RequestedQuantity = item.Quantity,
                            AvailableQuantity = 0,
                            IsAvailable = false
                        });
                    }

                    continue;
                }

                // Fetch the SellableProduct to check finished goods quantity_on_hand
                var product = await _context.SellableProducts
                    .AsNoTracking()
                    .FirstOrDefaultAsync(sp => sp.Id == menuItem.SellableProductId.Value && sp.OrganizationId == organizationId);


                if (product == null)
                {
                    //_logger.LogInformation($"Product query result for menu item {menuItemExternalId}: {(product != null ? product.Name : "NULL")}");
                    response.AllItemsAvailable = false;
                    foreach (var item in menuItemGroup)
                    {
                        response.Items.Add(new ItemAvailability
                        {
                            ProductId = 0,
                            ProductExternalId = Guid.Empty,
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
                foreach (var item in menuItemGroup)
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
                    .ThenInclude(oi => oi.MenuItem)
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
                var menuItem = orderItem.MenuItem;
                var product = menuItem?.SellableProduct;
                var pickListItem = new PickListItemDto
                {
                    OrderItemId = orderItem.Id,
                    OrderItemExternalId = orderItem.ExternalId,
                    ProductName = menuItem?.Name ?? "Unknown",
                    Sku = product?.Sku,
                    Quantity = orderItem.Quantity,
                    UnitOfMeasure = string.IsNullOrWhiteSpace(product?.OutputUnitMsr) ? "units" : product?.OutputUnitMsr ?? "units",
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
                    .ThenInclude(oi => oi.MenuItem)
                .Include(o => o.Organization)
                .Include(o => o.Customer)
                .Include(o => o.HolidayEvent)
                .Include(o => o.PickupSlot)
                .FirstOrDefaultAsync(o => o.ExternalId == externalId);

            if (order == null)
                return null;

            order.OrderStatus = "COMPLETED";
            order.CompletedAt = DateTime.UtcNow;
            order.UpdatedAt = DateTime.UtcNow;

            OrderSyncMilestoneAsync(order, order.OrderStatus);
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
                    .ThenInclude(oi => oi.MenuItem)
                .Include(o => o.Organization)
                .Include(o => o.Customer)
                .Include(o => o.HolidayEvent)
                .Include(o => o.PickupSlot)
                .FirstOrDefaultAsync(o => o.ExternalId == externalId);

            if (order == null)
                return null;

            var currentStatus = (order.OrderStatus ?? string.Empty).Trim().ToUpperInvariant();
            if (currentStatus != "PENDING" && currentStatus != "SUBMITTED" && currentStatus != "CONFIRMED")
            {
                throw new InvalidOperationException($"Order cannot be cancelled from status '{order.OrderStatus}'. Only PENDING or SUBMITTED orders can be cancelled.");
            }

            order.OrderStatus = "CANCELLED";
            order.CancelledAt = DateTime.UtcNow;
            order.UpdatedAt = DateTime.UtcNow;
            OrderSyncMilestoneAsync(order, order.OrderStatus);
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

        public async Task<OrderDetailDto?> ChangePickupSlotAsync(Guid externalId, Guid pickupSlotExternalId)
        {
            _logger.LogInformation($"Changing pickup slot for order {externalId} to {pickupSlotExternalId}");

            var order = await _context.Orders
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.MenuItem)
                .Include(o => o.Organization)
                .Include(o => o.Customer)
                .Include(o => o.HolidayEvent)
                .Include(o => o.PickupSlot)
                .FirstOrDefaultAsync(o => o.ExternalId == externalId);

            if (order == null)
                return null;

            var currentStatus = (order.OrderStatus ?? string.Empty).Trim().ToUpperInvariant();
            if (currentStatus != "PENDING" && currentStatus != "SUBMITTED")
            {
                throw new InvalidOperationException($"Order cannot change pickup slot from status '{order.OrderStatus}'. Only PENDING or SUBMITTED orders may change pickup slots.");
            }

            if (!order.HolidayEventId.HasValue)
            {
                throw new InvalidOperationException("Order is not associated with an event.");
            }

            var targetSlot = await _context.PickupSlots
                .FirstOrDefaultAsync(slot => slot.ExternalId == pickupSlotExternalId
                    && slot.OrganizationId == order.OrganizationId
                    && slot.HolidayEventId == order.HolidayEventId.Value);

            if (targetSlot == null)
            {
                throw new KeyNotFoundException("Pickup slot not found.");
            }

            if (!targetSlot.IsActive)
            {
                throw new InvalidOperationException("Pickup slot is inactive.");
            }

            if (order.PickupSlotId == targetSlot.Id)
            {
                return MapToDetailDto(order);
            }

            if (targetSlot.ReservedCount >= targetSlot.Capacity)
            {
                throw new InvalidOperationException("Pickup slot capacity has been reached.");
            }

            if (order.PickupSlot != null)
            {
                order.PickupSlot.ReservedCount = Math.Max(0, order.PickupSlot.ReservedCount - 1);
                order.PickupSlot.UpdatedAt = DateTime.UtcNow;
            }

            targetSlot.ReservedCount += 1;
            targetSlot.UpdatedAt = DateTime.UtcNow;

            order.PickupSlotId = targetSlot.Id;
            order.PickupSlot = targetSlot;
            order.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return MapToDetailDto(order);
        }


        public async Task<OrderSummary> ResolveOrderSummaryAsync(
            Guid orderId,
            string orderType,
            string? requestedReturnUrl)
        {
            if (orderId == Guid.Empty)
            {
                throw new ArgumentException("OrderId is required.", nameof(orderId));
            }

            var normalizedOrderType = NormalizeOrderType(orderType)?.ToLowerInvariant();
            if (normalizedOrderType is null)
            {
                throw new ArgumentException("OrderType is required.", nameof(orderType));
            }

            return normalizedOrderType switch
            {
                "preorder" => await ResolvePreOrderAsync(orderId, normalizedOrderType, requestedReturnUrl),
                "registration" => throw new NotSupportedException("Payment flow for order type 'registration' is not implemented yet."),
                "event" => throw new NotSupportedException("Payment flow for order type 'event' is not implemented yet."),
                "order" => throw new NotSupportedException("Payment flow for order type 'order' is not implemented yet."),
                "subscription" => throw new NotSupportedException("Payment flow for order type 'subscription' is not implemented yet."),
                _ => throw new NotSupportedException($"Payment flow for order type '{orderType}' is not implemented yet.")
            };
        }



        private async Task<OrderSummary> ResolvePreOrderAsync(
            Guid orderId,
            string normalizedOrderType,
            string? requestedReturnUrl)
        {
            var order = await GetExternalOrderByIdAsync(orderId);
            if (order == null)
            {
                throw new KeyNotFoundException("Order not found.");
            }

            var totalAmount = order.TotalAmount;
            var amountInCents = decimal.ToInt64(decimal.Round(totalAmount * 100m, 0, MidpointRounding.AwayFromZero));
            _logger.LogDebug($"Resolved order summary for PreOrder {orderId}: TotalAmount={totalAmount}, AmountInCents={amountInCents}");
        
            return new OrderSummary
            {
                OrderId = order.ExternalId,
                OrderType = normalizedOrderType,
                DisplayName = order.EventName ?? "Pre-order",
                TotalAmount = totalAmount,
                AmountInCents = amountInCents,
                Currency = "usd",
                ReturnUrl = ResolveReturnUrl(normalizedOrderType, order.ExternalId, requestedReturnUrl)
            };
        }
        private static bool IsSafeRelativeUrl(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return false;
            }

            return value.StartsWith('/')
                && !value.StartsWith("//")
                && !Uri.IsWellFormedUriString(value, UriKind.Absolute);
        }


        private string ResolveReturnUrl(string normalizedOrderType, Guid orderId, string? requestedReturnUrl)
        {
            if (IsSafeRelativeUrl(requestedReturnUrl))
            {
                return requestedReturnUrl!;
            }

            return normalizedOrderType switch
            {
                "preorder" => $"/payments/complete/{orderId}",
                _ => $"/payments/complete/{orderId}"
            };
        }


        private static string? NormalizeOrderType(string? orderType)
        {
            if (string.IsNullOrWhiteSpace(orderType))
            {
                return null;
            }

            return orderType.Trim().ToLowerInvariant() switch
            {
                "preorder" => "preorder",
                "pre-order" => "preorder",
                "customer-preorder" => "preorder",
                "customer_preorder" => "preorder",
                "customerpreorder" => "preorder",
                "company-registration" => "company-registration",
                "companyregistration" => "company-registration",
                "event" => "event",
                "event-creation" => "event",
                "standalone" => "standalone",
                _ => orderType.Trim().ToLowerInvariant()
            };
        }
        public async Task<List<OrderDto>> GetOrdersByStatusAsync(Guid organizationId, string status)
        {
            var sanitizedStatus = StringSanitizer.SanitizeForLog(status);
            _logger.LogDebug($"Getting orders with status '{sanitizedStatus}' for organization {organizationId}");
            
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
