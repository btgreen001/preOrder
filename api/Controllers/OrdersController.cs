using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PreOrderApp.Services;
using PreOrderApp.Services.Interfaces;
using PreOrderApp.Filters;
namespace PreOrderApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderService _orderService;
        private readonly ILogger<OrdersController> _logger;
        private readonly IOrganizationContextService _orgContext;

        public OrdersController(IOrderService orderService, ILogger<OrdersController> logger, IOrganizationContextService orgContext)
        {
            _orderService = orderService;
            _logger = logger;
            _orgContext = orgContext;
        }

        /// <summary>
        /// Get all orders for the authenticated user's organization
        /// </summary>
        [HttpGet]
        [Authorize]
        [ValidateTenantAccess]
        public async Task<IActionResult> GetOrders()
        {
            try
            {
                var organizationId = _orgContext.GetCurrentOrganizationId();
                _logger.LogInformation($"Getting all orders for organization {organizationId}");
                
                var orders = await _orderService.GetOrdersAsync(organizationId);
                return Ok(orders);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting orders");
                return StatusCode(500, new { error = "An error occurred while retrieving orders" });
            }
        }

        /// <summary>
        /// Get a specific order by external ID 
        /// </summary>
        [HttpGet("{externalId:guid}")]
        [Authorize]
        [ValidateTenantAccess]
        public async Task<IActionResult> GetOrderById(Guid externalId)
        {
            try
            {
                var organizationId = _orgContext.GetCurrentOrganizationId();
                _logger.LogInformation($"Getting order {externalId} for organization {organizationId}");
                
                var order = await _orderService.GetOrderByIdAsync(externalId, organizationId);
                if (order == null)
                    return NotFound(new { error = "Order not found" });
                
                return Ok(order);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting order");
                return StatusCode(500, new { error = "An error occurred while retrieving the order" });
            }
        }
        /// <summary>
        /// Create a new order
        /// </summary>
        [HttpPost]
        [Authorize]
        [ValidateTenantAccess]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var organizationId = _orgContext.GetCurrentOrganizationId();
                _logger.LogInformation($"Creating order for organization {organizationId}");
                
                var order = await _orderService.CreateOrderAsync(organizationId, request);
                return CreatedAtAction(nameof(GetOrderById), new { externalId = order.ExternalId }, order);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating order");
                return StatusCode(500, new { error = "An error occurred while creating the order" });
            }
        }

        /// <summary>
        /// Update an existing order
        /// </summary>
        [HttpPut("{externalId:guid}")]
        [Authorize]
        [ValidateTenantAccess]
        public async Task<IActionResult> UpdateOrder(Guid externalId, [FromBody] UpdateOrderRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                _logger.LogInformation($"Updating order {externalId}");
                
                var order = await _orderService.UpdateOrderAsync(externalId, request);
                if (order == null)
                    return NotFound(new { error = "Order not found" });
                
                return Ok(order);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating order");
                return StatusCode(500, new { error = "An error occurred while updating the order" });
            }
        }

        /// <summary>
        /// Update order status
        /// </summary>
        [HttpPut("{externalId:guid}/status")]
        [Authorize]
        [ValidateTenantAccess]
        public async Task<IActionResult> UpdateOrderStatus(Guid externalId, [FromBody] UpdateOrderStatusRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request?.NewStatus))
                    return BadRequest(new { error = "newStatus is required" });

                _logger.LogInformation($"Updating order {externalId} status to {request.NewStatus}");
                
                var order = await _orderService.UpdateOrderStatusAsync(externalId, request.NewStatus);
                if (order == null)
                    return NotFound(new { error = "Order not found" });
                
                return Ok(order);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating order status");
                return StatusCode(500, new { error = "An error occurred while updating order status" });
            }
        }

        /// <summary>
        /// Delete an order (soft delete to CANCELLED status)
        /// </summary>
        [HttpDelete("{externalId:guid}")]
        [Authorize]
        [ValidateTenantAccess]
        public async Task<IActionResult> DeleteOrder(Guid externalId)
        {
            try
            {
                _logger.LogInformation($"Deleting order {externalId}");
                
                var success = await _orderService.DeleteOrderAsync(externalId);
                if (!success)
                    return NotFound(new { error = "Order not found" });
                
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting order");
                return StatusCode(500, new { error = "An error occurred while deleting the order" });
            }
        }

        // ===== Phase 2: Business Logic Endpoints =====

        /// <summary>
        /// Validate if inventory is available for all items in an order
        /// </summary>
        [HttpPost("validate-inventory")]
        [Authorize]
        [ValidateTenantAccess]
        public async Task<IActionResult> ValidateOrderInventory([FromBody] List<CreateOrderItemRequest> items)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values.SelectMany(v => v.Errors);
                    _logger.LogError($"ModelState validation failed: {string.Join("; ", errors.Select(e => e.ErrorMessage))}");
                    return BadRequest(new { message = "Validation failed", errors = errors.Select(e => e.ErrorMessage).ToList() });
                }

                var organizationId = _orgContext.GetCurrentOrganizationId();
                _logger.LogInformation($"Validating inventory for {items.Count} items");
                
                var response = await _orderService.ValidateOrderInventoryAsync(organizationId, items);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating order inventory");
                return StatusCode(500, new { error = "An error occurred while validating inventory" });
            }
        }

        /// <summary>
        /// Check availability of a specific inventory item
        /// </summary>
        [HttpPost("check-availability")]
        [Authorize]
        [ValidateTenantAccess]
        public async Task<IActionResult> CheckAvailability([FromBody] InventoryCheckAvailabilityRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var organizationId = _orgContext.GetCurrentOrganizationId();
                _logger.LogInformation($"Checking availability for item {request.InventoryItemExternalId}");
                
                var response = await _orderService.CheckAvailabilityAsync(organizationId, request.InventoryItemExternalId, request.Quantity);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking availability");
                return StatusCode(500, new { error = "An error occurred while checking availability" });
            }
        }

        /// <summary>
        /// Generate pick list for an order (for fulfillment)
        /// </summary>
        [HttpGet("{externalId:guid}/pick-list")]
        [Authorize]
        [ValidateTenantAccess]
        public async Task<IActionResult> GeneratePickList(Guid externalId)
        {
            try
            {
                var organizationId = _orgContext.GetCurrentOrganizationId();
                _logger.LogInformation($"Generating pick list for order {externalId} in org {organizationId}");
                
                var pickList = await _orderService.GeneratePickListAsync(externalId, organizationId);
                if (pickList == null)
                    return NotFound(new { error = "Order not found" });
                
                return Ok(pickList);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating pick list");
                return StatusCode(500, new { error = "An error occurred while generating pick list" });
            }
        }

        /// <summary>
        /// Complete an order (mark as fulfilled)
        /// </summary>
        [HttpPut("{externalId:guid}/complete")]
        [Authorize]
        [ValidateTenantAccess]
        public async Task<IActionResult> CompleteOrder(Guid externalId)
        {
            try
            {
                _logger.LogInformation($"Completing order {externalId}");
                
                var order = await _orderService.CompleteOrderAsync(externalId);
                if (order == null)
                    return NotFound(new { error = "Order not found" });
                
                return Ok(order);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error completing order");
                return StatusCode(500, new { error = "An error occurred while completing the order" });
            }
        }

        /// <summary>
        /// Cancel an order
        /// </summary>
        [AllowAnonymous] // Allow public cancellation of orders (e.g. by customers)
        [HttpPut("{externalId:guid}/cancel")]
        public async Task<IActionResult> CancelOrder(Guid externalId)
        {
            try
            {
                _logger.LogInformation($"Cancelling order {externalId}");
                
                var order = await _orderService.CancelOrderAsync(externalId);
                if (order == null)
                    return NotFound(new { error = "Order not found" });
                
                return Ok(order);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Invalid cancel request for order {ExternalId}", externalId);
                return Conflict(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling order");
                return StatusCode(500, new { error = "An error occurred while cancelling the order" });
            }
        }

        /// <summary>
        /// Change the pickup slot for a public order
        /// </summary>
        [AllowAnonymous] // Allow public access to change pickup slot (e.g. by customers)
        [HttpPut("{externalId:guid}/pickup-slot")]
        public async Task<IActionResult> ChangePickupSlot(Guid externalId, [FromBody] ChangePickupSlotRequest request)
        {
            try
            {
                if (request == null || request.PickupSlotExternalId == Guid.Empty)
                    return BadRequest(new { error = "pickupSlotExternalId is required" });

                _logger.LogInformation($"Changing pickup slot for order {externalId} to {request.PickupSlotExternalId}");

                var order = await _orderService.ChangePickupSlotAsync(externalId, request.PickupSlotExternalId);
                if (order == null)
                    return NotFound(new { error = "Order not found" });

                return Ok(order);
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Pickup slot change target not found for order {ExternalId}", externalId);
                return NotFound(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Invalid pickup slot change request for order {ExternalId}", externalId);
                return Conflict(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing pickup slot for order {ExternalId}", externalId);
                return StatusCode(500, new { error = "An error occurred while changing the pickup slot" });
            }
        }

        /// <summary>
        /// Get orders by status
        /// </summary>
        [HttpGet("by-status/{status}")]
        [Authorize]
        [ValidateTenantAccess]
        public async Task<IActionResult> GetOrdersByStatus(string status)
        {
            try
            {
                var organizationId = _orgContext.GetCurrentOrganizationId();
                _logger.LogInformation($"Getting orders with status {status}");
                
                var orders = await _orderService.GetOrdersByStatusAsync(organizationId, status);
                return Ok(orders);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting orders by status");
                return StatusCode(500, new { error = "An error occurred while retrieving orders" });
            }
        }

    }

}

