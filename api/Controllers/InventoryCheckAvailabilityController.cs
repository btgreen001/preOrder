using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PreOrderApp.Services;
using PreOrderApp.Services.Interfaces;
using PreOrderApp.Filters;
using PreOrderApp.Models;

namespace PreOrderApp.Controllers
{
    /// <summary>
    /// Inventory Check Availability Controller - Provides endpoints for checking inventory item availability
    /// </summary>
    [ApiController]
    [Route("api/inventory")]
    [Authorize(Roles = UserRoles.SystemAdmin + "," + UserRoles.CompanyAdmin + ",admin," + UserRoles.User)]
    [ValidateTenantAccess]
    public class InventoryCheckAvailabilityController : ControllerBase
    {
        private readonly IInventoryService _inventoryService;
        private readonly ILogger<InventoryCheckAvailabilityController> _logger;
        private readonly IOrganizationContextService _orgContext;

        public InventoryCheckAvailabilityController(IInventoryService inventoryService, ILogger<InventoryCheckAvailabilityController> logger, IOrganizationContextService orgContext)
        {
            _inventoryService = inventoryService;
            _logger = logger;
            _orgContext = orgContext;
        }

        /// <summary>
        /// Check if sufficient inventory is available for a given item
        /// </summary>
        /// <param name="request">Inventory item external ID and requested quantity</param>
        /// <returns>Availability status with detailed item information</returns>
        [HttpPost("check-availability")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> CheckAvailability([FromBody] InventoryCheckAvailabilityRequest request)
        {
            try
            {
                // Extract organization ID from JWT claims
                // Tenant access validation is handled by [ValidateTenantAccess] filter
                var organizationId = _orgContext.GetCurrentOrganizationId();

                // Validate request
                if (request == null || request.InventoryItemExternalId == Guid.Empty || request.Quantity <= 0)
                {
                    return BadRequest(new { message = "Invalid request: InventoryItemExternalId must not be empty and Quantity must be greater than 0" });
                }

                _logger.LogInformation($"Checking availability for inventory item {request.InventoryItemExternalId}, quantity {request.Quantity}, organization {organizationId}");

                // Call service
                var response = await _inventoryService.CheckAvailabilityAsync(organizationId, request.InventoryItemExternalId, request.Quantity);

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error checking inventory availability: {ex.Message}");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error checking inventory availability", error = ex.Message });
            }
        }
    }
}
