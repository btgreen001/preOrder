using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace OrderMgmt.Services.Interfaces
{
    public interface ISellableProductService
    {
        Task<List<SellableProductDto>> GetAllProductsAsync(Guid organizationId);
        Task<SellableProductDetailDto> GetProductByIdAsync(Guid externalId,Guid organizationId);
        Task<SellableProductDetailDto> CreateProductAsync(Guid organizationId, CreateSellableProductRequest request, Guid userId);
        Task<SellableProductDetailDto> UpdateProductAsync(Guid externalId,Guid organizationId, UpdateSellableProductRequest request, Guid userId);
        Task<bool> DeleteProductAsync(Guid externalId, Guid organizationId, int versionNbr, Guid userId);
    }

    public class SellableProductDto
    {
        public long Id { get; set; }
        public Guid ExternalId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Sku { get; set; }
        public long? CategoryId { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal? UnitCost { get; set; }
        public bool IsActive { get; set; }
        public bool IsRecipeComponent { get; set; }
        public bool IsForSale { get; set; }
        public decimal? OutputUnitCount { get; set; }
        public string? OutputUnitMsr { get; set; }
        public decimal? BaseUnitsPerOutputUnit { get; set; }
        public decimal ServingsPerPackage { get; set; } = 1;  // Number of servings per package
    }

    public class SellableProductDetailDto : SellableProductDto
    {
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateSellableProductRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Sku { get; set; }
        public long? CategoryId { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal? UnitCost { get; set; }
        public bool IsRecipeComponent { get; set; } = false;
        public bool IsForSale { get; set; } = true;
        public decimal? OutputUnitCount { get; set; }
        public string? OutputUnitMsr { get; set; }
        public decimal? BaseUnitsPerOutputUnit { get; set; }
        public decimal ServingsPerPackage { get; set; } = 1;  // Number of servings per package
    }

    public class UpdateSellableProductRequest
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public long? CategoryId { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal? UnitCost { get; set; }
        public bool? IsRecipeComponent { get; set; }
        public bool? IsForSale { get; set; }
        public decimal? OutputUnitCount { get; set; }
        public string? OutputUnitMsr { get; set; }
        public decimal? BaseUnitsPerOutputUnit { get; set; }
        public decimal? ServingsPerPackage { get; set; }  // Number of servings per package
        public int VersionNbr { get; set; }
    }
}
