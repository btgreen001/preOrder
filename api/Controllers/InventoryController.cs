using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PreOrderApp.Services;
using PreOrderApp.Services.Interfaces;
using PreOrderApp.Filters;
using PreOrderApp.Models;

namespace PreOrderApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = UserRoles.SystemAdmin + "," + UserRoles.CompanyAdmin + ",admin," + UserRoles.User)]
    [ValidateTenantAccess]

    public class InventoryController : ControllerBase
    {
        private readonly IInventoryService _inventoryService;
        private readonly ILogger<InventoryController> _logger;
        private readonly IOrganizationContextService _orgContext;

        /// <summary>
        /// Get composite inventory items (inventory + recipe components)
        /// </summary>
        [HttpGet("composite-list")]
        public async Task<IActionResult> GetCompositeInventory()
        {
            try
            {
                var organizationId = _orgContext.GetCurrentOrganizationId();
                var items = await _inventoryService.GetCompositeInventoryAsync(organizationId);
                return Ok(items);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting composite inventory list");
                return StatusCode(500, new { error = "An error occurred while retrieving composite inventory list" });
            }
        }

        public InventoryController(IInventoryService inventoryService, ILogger<InventoryController> logger, IOrganizationContextService orgContext)
        {
            _inventoryService = inventoryService;
            _logger = logger;
            _orgContext = orgContext;
        }

        /// <summary>
        /// Get all inventory items below reorder point
        /// </summary>
        [HttpGet("low-stock")]
        public async Task<IActionResult> GetLowStockItems()
        {
            try
            {
                var organizationId = _orgContext.GetCurrentOrganizationId();
                _logger.LogInformation($"Getting low stock items for organization {organizationId}");

                var items = await _inventoryService.GetLowStockItemsAsync(organizationId);
                return Ok(items);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting low stock items");
                return StatusCode(500, new { error = "An error occurred while retrieving low stock items" });
            }
        }

        /// <summary>
        /// Get all inventory items expiring soon
        /// </summary>
        [HttpGet("expiring-soon")]
        public async Task<IActionResult> GetExpiringItems([FromQuery] int daysUntilExpiration = 7)
        {
            try
            {
                var organizationId = _orgContext.GetCurrentOrganizationId();
                _logger.LogInformation($"Getting expiring items for organization {organizationId} (days: {daysUntilExpiration})");

                var items = await _inventoryService.GetExpiringItemsAsync(organizationId, daysUntilExpiration);
                return Ok(items);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting expiring items");
                return StatusCode(500, new { error = "An error occurred while retrieving expiring items" });
            }
        }

        /// <summary>
        /// Get all inventory items for the organization
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllItems()
        {
            try
            {
                var organizationId = _orgContext.GetCurrentOrganizationId();
                _logger.LogInformation($"Getting all inventory items for organization {organizationId}");

                var items = await _inventoryService.GetAllItemsAsync(organizationId);
                return Ok(items);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting inventory items");
                return StatusCode(500, new { error = "An error occurred while retrieving inventory items" });
            }
        }

        /// <summary>
        /// Get active inventory categories for the organization
        /// </summary>
        [HttpGet("item-categories")]
        public async Task<IActionResult> GetItemCategories()
        {
            try
            {
                var organizationId = _orgContext.GetCurrentOrganizationId();
                _logger.LogInformation($"Getting inventory categories for organization {organizationId}");

                var categories = await _inventoryService.GetItemCategoriesAsync(organizationId);
                return Ok(categories);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting inventory categories");
                return StatusCode(500, new { error = "An error occurred while retrieving inventory categories" });
            }
        }
        [HttpGet("product-categories")]
        public async Task<IActionResult> GetProductCategories()
        {
            try
            {
                var organizationId = _orgContext.GetCurrentOrganizationId();
                _logger.LogInformation($"Getting product categories for organization {organizationId}");

                var categories = await _inventoryService.GetProductCategoriesAsync(organizationId);
                return Ok(categories);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting product categories");
                return StatusCode(500, new { error = "An error occurred while retrieving product categories" });
            }
        }
        /// <summary>
        /// Get recipe components (sellable products marked as recipe components) for inventory composite views
        /// </summary>
        [HttpGet("recipe-components")]
        public async Task<IActionResult> GetRecipeComponents()
        {
            try
            {
                var organizationId = _orgContext.GetCurrentOrganizationId();
                _logger.LogInformation($"Getting recipe components for inventory list for organization {organizationId}");

                var components = await _inventoryService.GetRecipeComponentsAsync(organizationId);
                return Ok(components);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting inventory recipe components");
                return StatusCode(500, new { error = "An error occurred while retrieving recipe components" });
            }
        }

        /// <summary>
        /// Get inventory dashboard summary metrics
        /// </summary>
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            try
            {
                var organizationId = _orgContext.GetCurrentOrganizationId();
                var summary = await _inventoryService.GetSummaryAsync(organizationId);
                return Ok(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting inventory summary");
                return StatusCode(500, new { error = "An error occurred while retrieving inventory summary" });
            }
        }

        /// <summary>
        /// Get a specific inventory item by external ID
        /// </summary>
        [HttpGet("{externalId:guid}")]
        public async Task<IActionResult> GetItemById(Guid externalId)
        {
            try
            {
                var organizationId = _orgContext.GetCurrentOrganizationId();
                _logger.LogInformation($"Getting inventory item {externalId}");

                var item = await _inventoryService.GetItemByIdAsync(organizationId, externalId);
                if (item == null)
                    return NotFound(new { error = "Inventory item not found" });

                return Ok(item);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting inventory item");
                return StatusCode(500, new { error = "An error occurred while retrieving the inventory item" });
            }
        }

        /// <summary>
        /// Get inventory items by supplier ID
        /// </summary>
        [HttpGet("supplier/{supplierExternalId:guid}")]
        public async Task<IActionResult> GetItemsBySupplier(Guid supplierExternalId)
        {
            try
            {
                var organizationId = _orgContext.GetCurrentOrganizationId();
                _logger.LogInformation($"Getting inventory items for supplier {supplierExternalId} in organization {organizationId}");

                var items = await _inventoryService.GetItemsBySupplierAsync(organizationId, supplierExternalId);
                return Ok(items);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting inventory items by supplier");
                return StatusCode(500, new { error = "An error occurred while retrieving inventory items" });
            }
        }

        /// <summary>
        /// Receive goods into inventory
        /// </summary>
        [HttpPost("receive")]
        [Authorize(Roles = UserRoles.SystemAdmin + "," + UserRoles.CompanyAdmin + ",admin")]
        public async Task<IActionResult> ReceiveGoods([FromBody] ReceiveGoodsRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var organizationId = _orgContext.GetCurrentOrganizationId();
                _logger.LogInformation($"Receiving goods for organization {organizationId}");

                var item = await _inventoryService.ReceiveGoodsAsync(organizationId, request);
                return CreatedAtAction(nameof(GetItemById), new { externalId = item.ExternalId }, item);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error receiving goods");
                return StatusCode(500, new { error = "An error occurred while receiving goods" });
            }
        }

        /// <summary>
        /// Update an inventory item
        /// </summary>
        [HttpPut("{externalId:guid}")]
        [Authorize(Roles = UserRoles.SystemAdmin + "," + UserRoles.CompanyAdmin + ",admin")]
        public async Task<IActionResult> UpdateItem(Guid externalId, [FromBody] UpdateInventoryItemRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var organizationId = _orgContext.GetCurrentOrganizationId();
                var item = await _inventoryService.UpdateItemAsync(organizationId, externalId, request);
                return Ok(item);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating inventory item");
                return StatusCode(500, new { error = "An error occurred while updating inventory item" });
            }
        }

        /// <summary>
        /// Soft-delete an inventory item
        /// </summary>
        [HttpDelete("{externalId:guid}")]
        [Authorize(Roles = UserRoles.SystemAdmin + "," + UserRoles.CompanyAdmin + ",admin")]
        public async Task<IActionResult> DeleteItem(Guid externalId)
        {
            try
            {
                var organizationId = _orgContext.GetCurrentOrganizationId();
                var deleted = await _inventoryService.DeleteItemAsync(organizationId, externalId);
                if (!deleted)
                    return NotFound(new { error = "Inventory item not found" });

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting inventory item");
                return StatusCode(500, new { error = "An error occurred while deleting inventory item" });
            }
        }

        /// <summary>
        /// Adjust inventory quantity for an item
        /// </summary>
        [HttpPost("{externalId:guid}/adjust")]
        public async Task<IActionResult> AdjustQuantity(Guid externalId, [FromBody] InventoryAdjustmentRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                _logger.LogInformation($"Adjusting inventory for item {externalId}");

                var movement = await _inventoryService.AdjustQuantityAsync(externalId, request);
                return Ok(movement);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Inventory item not found");
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adjusting inventory");
                return StatusCode(500, new { error = "An error occurred while adjusting inventory" });
            }
        }

        /// <summary>
        /// Get inventory movement history for an item
        /// </summary>
        [HttpGet("{externalId:guid}/movements")]
        public async Task<IActionResult> GetMovements(Guid externalId)
        {
            try
            {
                var organizationId = _orgContext.GetCurrentOrganizationId();
                _logger.LogInformation($"Getting movement history for inventory item {externalId}");

                var movements = await _inventoryService.GetMovementsAsync(organizationId, externalId);
                return Ok(movements);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting inventory movements");
                return StatusCode(500, new { error = "An error occurred while retrieving movement history" });
            }
        }

        /// <summary>
        /// Reserve inventory for an order
        /// </summary>
        [HttpPost("{externalId:guid}/reserve")]
        public async Task<IActionResult> ReserveInventory(Guid externalId, [FromBody] ReserveInventoryRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                _logger.LogInformation($"Reserving inventory item {externalId} for reference {request.ReferenceId}");

                var response = await _inventoryService.ReserveInventoryAsync(externalId, request.Quantity, request.ReferenceId);

                if (!response.IsAvailable)
                    return BadRequest(response);

                return Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Inventory item not found");
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reserving inventory");
                return StatusCode(500, new { error = "An error occurred while reserving inventory" });
            }
        }

        /// <summary>
        /// Request class for reserve inventory endpoint
        /// </summary>
        public class ReserveInventoryRequest
        {
            public decimal Quantity { get; set; }
            public string ReferenceId { get; set; } = string.Empty;
        }


    }
}
