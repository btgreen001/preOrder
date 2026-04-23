using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using OrderMgmt.Data;
using OrderMgmt.Services.Interfaces;
using OrderMgmt.Services;
using OrderMgmt.Filters;

namespace OrderMgmt.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [ValidateTenantAccess]

    public class ProductsController : ControllerBase
    {
        private readonly ISellableProductService _sellableProductService;
        private readonly ILogger<ProductsController> _logger;
        private readonly OrderMgmtDbContext _dbContext;
        private readonly IOrganizationContextService _orgContext;

        public ProductsController(ISellableProductService sellableProductService, ILogger<ProductsController> logger, OrderMgmtDbContext dbContext, IOrganizationContextService orgContext)
        {
            _sellableProductService = sellableProductService;
            _logger = logger;
            _dbContext = dbContext;
            _orgContext = orgContext;
        }

        /// <summary>
        /// Get all active sellable products for the organization
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllProducts()
        {
            try
            {
                var organizationId = _orgContext.GetCurrentOrganizationId();
                _logger.LogInformation($"Getting all active sellable products for organization {organizationId}");
                
                var products = await _sellableProductService.GetAllProductsAsync(organizationId);
                return Ok(products);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting sellable products");
                return StatusCode(500, new { error = "An error occurred while retrieving products" });
            }
        }

        /// <summary>
        /// Get a specific sellable product by external ID
        /// </summary>
        [HttpGet("{externalId:guid}")]
        public async Task<IActionResult> GetProductById(Guid externalId, Guid organizationId)
        {
            try
            {
                _logger.LogInformation($"Getting sellable product {externalId} for organization {organizationId}");
                
                var product = await _sellableProductService.GetProductByIdAsync(externalId, organizationId);
                if (product == null)
                    return NotFound(new { error = "Sellable product not found" });
                
                return Ok(product);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting sellable product");
                return StatusCode(500, new { error = "An error occurred while retrieving the product" });
            }
        }

        
        /// <summary>
        /// Create a new sellable product
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateProduct([FromBody] CreateSellableProductRequest request)
        {
            try
            {
                var orgId = _orgContext.GetCurrentOrganizationId();
                var userId = _orgContext.GetCurrentUserId();
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                _logger.LogInformation($"Creating sellable product for organization {orgId}");
                
                var product = await _sellableProductService.CreateProductAsync(orgId, request, userId);
                return CreatedAtAction(nameof(GetProductById), new { externalId = product.ExternalId }, product);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Sellable product creation failed - duplicate SKU or validation error");
                return BadRequest(new { error = ex.Message });
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogWarning(dbEx, "Sellable product creation failed during DB save");
                if (dbEx.InnerException is PostgresException pgEx && pgEx.SqlState == "23505")
                {
                    return Conflict(new { error = "SKU or unique field already exists" });
                }

                return StatusCode(500, new { error = "An error occurred while saving the product" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating sellable product");
                return StatusCode(500, new { error = "An error occurred while creating the product" });
            }
        }

        /// <summary>
        /// Check SKU availability for the current organization
        /// </summary>
        [HttpGet("sku-available")]
        public async Task<IActionResult> IsSkuAvailable([FromQuery] string sku)
        {
            if (string.IsNullOrWhiteSpace(sku))
                return BadRequest(new { error = "sku is required" });

            try
            {
                var organizationId = _orgContext.GetCurrentOrganizationId();
                var exists = await _dbContext.SellableProducts
                    .AsNoTracking()
                    .AnyAsync(p => p.OrganizationId == organizationId && p.Sku == sku);

                return Ok(new { available = !exists });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking SKU availability");
                return StatusCode(500, new { error = "An error occurred while checking SKU availability" });
            }
        }

        /// <summary>
        /// Suggest a unique SKU for the current organization.
        /// Returns a short server-generated SKU that does not currently exist.
        /// </summary>
        [HttpGet("sku-suggest")]
        public async Task<IActionResult> SuggestSku()
        {
            try
            {
                var organizationId = _orgContext.GetCurrentOrganizationId();

                // Try a few deterministic/random suggestions until an unused one is found
                for (int attempt = 0; attempt < 6; attempt++)
                {
                    var candidate = $"AUTO-{Guid.NewGuid().ToString().Split('-')[0].ToUpper()}";
                    var exists = await _dbContext.SellableProducts
                        .AsNoTracking()
                        .AnyAsync(p => p.OrganizationId == organizationId && p.Sku == candidate);

                    if (!exists)
                        return Ok(new { sku = candidate });
                }

                _logger.LogWarning("Unable to generate an unused SKU after several attempts for org {OrgId}", _orgContext.GetCurrentOrganizationId());
                return StatusCode(500, new { error = "Unable to generate unique SKU" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating SKU suggestion");
                return StatusCode(500, new { error = "An error occurred while suggesting a SKU" });
            }
        }
        /// <summary>
        /// Update an existing sellable product
        /// </summary>
        [HttpPut("{externalId:guid}")]
        public async Task<IActionResult> UpdateProduct(Guid externalId, Guid organizationId, [FromBody] UpdateSellableProductRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                _logger.LogInformation($"Updating sellable product {externalId} for organization {organizationId}");
                var userId = _orgContext.GetCurrentUserId();
                var product = await _sellableProductService.UpdateProductAsync(externalId, organizationId, request, userId);
                if (product == null)
                    return NotFound(new { error = "Sellable product not found" });
                
                return Ok(product);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating sellable product");
                return StatusCode(500, new { error = "An error occurred while updating the product" });
            }
        }

        /// <summary>
        /// Delete a sellable product (soft delete via IsActive flag)
        /// </summary>
        [HttpDelete("{externalId:guid}")]
        public async Task<IActionResult> DeleteProduct(Guid externalId, Guid organizationId, [FromBody] int versionNbr)
        {
            try
            {
                _logger.LogInformation($"Deleting sellable product {externalId} for organization {organizationId}");
                var userId = _orgContext.GetCurrentUserId();
                
                var success = await _sellableProductService.DeleteProductAsync(externalId, organizationId, versionNbr, userId);
                if (!success)
                    return NotFound(new { error = "Sellable product not found" });
                
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting sellable product");
                return StatusCode(500, new { error = "An error occurred while deleting the product" });
            }
        }


    }
}
