using Microsoft.EntityFrameworkCore;
using PreOrderApp.Data;

namespace PreOrderApp.Infrastructure;

/// <summary>
/// Configures optimistic locking (concurrency tokens) for all entities with VersionNbr property
/// Call this in DbContext.OnModelCreating to enable automatic EF Core concurrency checking
/// </summary>
public static class OptimisticLockingConfiguration
{
    /// <summary>
    /// Configures all entities with VersionNbr property as concurrency tokens
    /// EF Core will automatically include "WHERE version_nbr = @originalValue" in UPDATE statements
    /// and throw DbUpdateConcurrencyException if 0 rows affected
    /// </summary>
    public static void ConfigureOptimisticLocking(this ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            // Find VersionNbr property on entity
            var versionProperty = entityType.FindProperty("VersionNbr");
            
            if (versionProperty != null)
            {
                // Mark as concurrency token - EF Core will check this in WHERE clause of UPDATE
                versionProperty.IsConcurrencyToken = true;
                
                // Note: We still manually increment VersionNbr in service layer for explicit control
                // EF Core's automatic increment (IsRowVersion) is SQL Server specific
            }
        }
    }
    
    /// <summary>
    /// Alternative: Configure specific entities individually
    /// Use this if you want more control over which entities use optimistic locking
    /// </summary>
    public static void ConfigureOptimisticLockingExplicit(this ModelBuilder modelBuilder)
    {
        // Recipe entities
        modelBuilder.Entity<Models.RecipeDetail>()
            .Property(r => r.VersionNbr)
            .IsConcurrencyToken();
        
        modelBuilder.Entity<Models.RecipeIngredient>()
            .Property(r => r.VersionNbr)
            .IsConcurrencyToken();
        
        modelBuilder.Entity<Models.RecipeComposition>()
            .Property(r => r.VersionNbr)
            .IsConcurrencyToken();
        
        modelBuilder.Entity<Models.RecipeStep>()
            .Property(r => r.VersionNbr)
            .IsConcurrencyToken();
        
        // Product entities
        modelBuilder.Entity<Models.SellableProduct>()
            .Property(p => p.VersionNbr)
            .IsConcurrencyToken();
        
        // Inventory entities
        modelBuilder.Entity<Models.InventoryItem>()
            .Property(i => i.VersionNbr)
            .IsConcurrencyToken();
        
        // Order entities
        modelBuilder.Entity<Models.Order>()
            .Property(o => o.VersionNbr)
            .IsConcurrencyToken();
        
        modelBuilder.Entity<Models.OrderItem>()
            .Property(o => o.VersionNbr)
            .IsConcurrencyToken();
        
        // Add more as needed...
    }
}
