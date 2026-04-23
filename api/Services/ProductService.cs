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
    public class SellableProductService : ISellableProductService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<SellableProductService> _logger;

        public SellableProductService(AppDbContext context, ILogger<SellableProductService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<SellableProductDto>> GetAllProductsAsync(Guid organizationId)
        {
            _logger.LogDebug("Getting all active sellable products for organization {OrgId}", organizationId);
            
            var products = await _context.SellableProducts
                .AsNoTracking()
                .Where(p => p.OrganizationId == organizationId && p.IsActive)
                .Select(p => new SellableProductDto
                {
                    Id = p.Id,
                    ExternalId = p.ExternalId,
                    Name = p.Name,
                    Sku = p.Sku,
                    CategoryId = p.CategoryId,
                    UnitPrice = p.UnitPrice,
                    UnitCost = p.UnitCost,
                    IsActive = p.IsActive,
                    IsRecipeComponent = p.IsRecipeComponent,
                    IsForSale = p.IsForSale,
                    OutputUnitCount = p.OutputUnitCount,
                    OutputUnitMsr = p.OutputUnitMsr,
                    BaseUnitsPerOutputUnit = p.BaseUnitsPerOutputUnit,
                    ServingsPerPackage = p.ServingsPerPackage
                })
                .ToListAsync();

            return products;
        }

        public async Task<SellableProductDetailDto> GetProductByIdAsync(Guid externalId,Guid organizationId)
        {
            _logger.LogDebug($"Getting sellable product {externalId} for organization {organizationId}");
            
            var product = await _context.SellableProducts
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.ExternalId == externalId && p.OrganizationId == organizationId);
            if (product == null)
                throw new InvalidOperationException($"Sellable product {externalId} not found");

            return new SellableProductDetailDto
            {
                Id = product.Id,
                ExternalId = product.ExternalId,
                Name = product.Name,
                Sku = product.Sku,
                CategoryId = product.CategoryId,
                UnitPrice = product.UnitPrice,
                IsActive = product.IsActive,
                IsRecipeComponent = product.IsRecipeComponent,
                IsForSale = product.IsForSale,
                Description = product.Description,
                UnitCost = product.UnitCost,
                OutputUnitCount = product.OutputUnitCount,
                OutputUnitMsr = product.OutputUnitMsr,
                BaseUnitsPerOutputUnit = product.BaseUnitsPerOutputUnit,
                ServingsPerPackage = product.ServingsPerPackage,
                CreatedAt = product.CreatedAt
            };
        }

        public async Task<SellableProductDetailDto> CreateProductAsync(Guid organizationId, CreateSellableProductRequest request, Guid userId)
        {
            _logger.LogInformation($"Creating sellable product {request.Name} for organization {organizationId}");
            SellableProduct? existing = null;
            
            // Check for duplicate name if SKU is null
            if (string.IsNullOrWhiteSpace(request.Sku))
            {            
                existing = await _context.SellableProducts
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.OrganizationId == organizationId && p.Name == request.Name);
            }
            else
            //check for duplicate SKU
            {
                existing = await _context.SellableProducts
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.OrganizationId == organizationId && p.Sku == request.Sku);
            }           
            if (existing != null)
            {
                // RECIPE(6) FIX: Provide accurate error message based on what was actually checked
                var checkField = string.IsNullOrWhiteSpace(request.Sku) ? $"Name '{request.Name}'" : $"SKU '{request.Sku}'";
                throw new InvalidOperationException($"Sellable product with {checkField} already exists");
            }

            var product = new SellableProduct
            {
                ExternalId = Guid.NewGuid(),
                OrganizationId = organizationId,
                Name = request.Name,
                Description = request.Description,
                Sku = request.Sku,
                CategoryId = request.CategoryId,
                UnitPrice = request.UnitPrice,
                UnitCost = request.UnitCost ?? 0m,
                IsRecipeComponent = request.IsRecipeComponent,
                IsForSale = request.IsForSale,
                OutputUnitCount = request.OutputUnitCount,
                OutputUnitMsr = string.IsNullOrWhiteSpace(request.OutputUnitMsr) ? "unit" : request.OutputUnitMsr.Trim(),
                BaseUnitsPerOutputUnit = request.BaseUnitsPerOutputUnit,
                ServingsPerPackage = request.ServingsPerPackage,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId,
                UpdatedAt = DateTime.UtcNow,
                UpdatedBy = userId,
                VersionNbr = 1
            };

            _context.SellableProducts.Add(product);
            await _context.SaveChangesAsync();

            return new SellableProductDetailDto
            {
                Id = product.Id,
                ExternalId = product.ExternalId,
                Name = product.Name,
                Sku = product.Sku,
                CategoryId = product.CategoryId,
                UnitPrice = product.UnitPrice,
                IsActive = product.IsActive,
                IsRecipeComponent = product.IsRecipeComponent,
                IsForSale = product.IsForSale,
                Description = product.Description,
                UnitCost = product.UnitCost,
                OutputUnitCount = product.OutputUnitCount,
                OutputUnitMsr = product.OutputUnitMsr,
                BaseUnitsPerOutputUnit = product.BaseUnitsPerOutputUnit,
                ServingsPerPackage = product.ServingsPerPackage,
                CreatedAt = product.CreatedAt
            };
        }

        public async Task<SellableProductDetailDto> UpdateProductAsync(Guid externalId, Guid organizationId, UpdateSellableProductRequest request, Guid userId)
        {
            _logger.LogInformation($"Updating sellable product {externalId} for organization {organizationId}");
            
            var product = await _context.SellableProducts.FirstOrDefaultAsync(p => p.ExternalId == externalId && p.OrganizationId == organizationId);
            if (product == null)
                throw new InvalidOperationException($"Sellable product {externalId} not found");

            // Use reusable optimistic locking extension
            await _context.UpdateWithVersionCheckAsync<SellableProduct>(
                product,
                request.VersionNbr,
                "Product",
                product.Name,
                p =>
                {
                    p.Name = request.Name ?? p.Name;
                    p.Description = request.Description ?? p.Description;
                    p.CategoryId = request.CategoryId ?? p.CategoryId;
                    p.UnitPrice = request.UnitPrice;
                    p.UnitCost = request.UnitCost ?? p.UnitCost;
                    p.IsRecipeComponent = request.IsRecipeComponent ?? p.IsRecipeComponent;
                    p.IsForSale = request.IsForSale ?? p.IsForSale;
                    p.OutputUnitCount = request.OutputUnitCount ?? p.OutputUnitCount;
                    p.OutputUnitMsr = string.IsNullOrWhiteSpace(request.OutputUnitMsr) ? p.OutputUnitMsr : request.OutputUnitMsr.Trim();
                    p.BaseUnitsPerOutputUnit = request.BaseUnitsPerOutputUnit ?? p.BaseUnitsPerOutputUnit;
                    p.ServingsPerPackage = request.ServingsPerPackage ?? p.ServingsPerPackage;
                    p.UpdatedAt = DateTime.UtcNow;
                    p.UpdatedBy = userId;
                },
                _logger);

            return new SellableProductDetailDto
            {
                Id = product.Id,
                ExternalId = product.ExternalId,
                Name = product.Name,
                Sku = product.Sku,
                CategoryId = product.CategoryId,
                UnitPrice = product.UnitPrice,
                IsActive = product.IsActive,
                IsRecipeComponent = product.IsRecipeComponent,
                IsForSale = product.IsForSale,
                Description = product.Description,
                UnitCost = product.UnitCost,
                OutputUnitCount = product.OutputUnitCount,
                OutputUnitMsr = product.OutputUnitMsr,
                BaseUnitsPerOutputUnit = product.BaseUnitsPerOutputUnit,
                ServingsPerPackage = product.ServingsPerPackage,
                CreatedAt = product.CreatedAt
            };
        }

        public async Task<bool> DeleteProductAsync(Guid externalId, Guid organizationId, int versionNbr, Guid userId)
        {
            _logger.LogInformation($"Deleting sellable product {externalId} for organization {organizationId}");
            
            var product = await _context.SellableProducts.FirstOrDefaultAsync(p => p.ExternalId == externalId && p.OrganizationId == organizationId);
            if (product == null)
                return false;

            // RECIPE(7) FIX: Check if other recipes use this product as a finished good before deletion
            var dependentRecipes = await _context.RecipeDetails
                .AsNoTracking()
                .Where(r => r.ProductId == product.Id 
                    && r.OrganizationId == organizationId 
                    && !r.IsDeleted)
                .ToListAsync();

            if (dependentRecipes.Any())
            {
                var recipeNames = string.Join(", ", dependentRecipes.Select(r => r.RecipeName));
                throw new InvalidOperationException(
                    $"Cannot delete product '{product.Name}' because it is used as the finished good for {dependentRecipes.Count} recipe(s): {recipeNames}. " +
                    $"Remove this product from those recipes or delete the recipes first.");
            }

            // Soft delete with optimistic locking
            await _context.UpdateWithVersionCheckAsync<SellableProduct>(
                product,
                versionNbr,
                "Product",
                product.Name,
                p =>
                {
                    p.IsActive = false;
                    p.UpdatedAt = DateTime.UtcNow;
                    p.UpdatedBy = userId;
                },
                _logger);

            return true;
        }
    }
}
