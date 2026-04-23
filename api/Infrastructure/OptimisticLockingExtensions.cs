using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace OrderMgmt.Infrastructure;

/// <summary>
/// Reusable extension methods for optimistic locking with version_nbr field
/// Provides consistent concurrency conflict handling across all entities
/// </summary>
public static class OptimisticLockingExtensions
{
    /// <summary>
    /// Validates that the expected version matches the current entity version before update
    /// Throws InvalidOperationException if version mismatch detected
    /// </summary>
    /// <typeparam name="TEntity">Entity type with VersionNbr property</typeparam>
    /// <param name="entity">The entity to validate</param>
    /// <param name="expectedVersion">The version number the client expects</param>
    /// <param name="entityName">Human-readable entity name for error messages</param>
    /// <param name="entityIdentifier">Entity identifier for logging (e.g., external_id or name)</param>
    /// <param name="logger">Optional logger for warnings</param>
    /// <exception cref="InvalidOperationException">Thrown when version mismatch detected</exception>
    public static void ValidateVersion<TEntity>(
        this TEntity entity,
        int? expectedVersion,
        string entityName,
        string entityIdentifier,
        ILogger? logger = null) where TEntity : class
    {
        if (!expectedVersion.HasValue)
            return; // No version check requested
        
        var versionProperty = typeof(TEntity).GetProperty("VersionNbr");
        if (versionProperty == null)
            throw new InvalidOperationException($"Entity {typeof(TEntity).Name} does not have a VersionNbr property");
        
        var currentVersion = (int?)versionProperty.GetValue(entity);
        if (!currentVersion.HasValue)
            throw new InvalidOperationException($"Entity {typeof(TEntity).Name} VersionNbr is null");
        
        if (expectedVersion.Value != currentVersion.Value)
        {
            logger?.LogWarning(
                "Concurrency conflict for {EntityType} {Identifier}: expected version {ExpectedVersion}, current version {CurrentVersion}",
                entityName, entityIdentifier, expectedVersion.Value, currentVersion.Value);
            
            throw new InvalidOperationException(
                $"{entityName} '{entityIdentifier}' was modified by another user. Please refresh and try again. " +
                $"(Expected version {expectedVersion.Value}, current version {currentVersion.Value})");
        }
    }
    
    /// <summary>
    /// Saves changes with automatic DbUpdateConcurrencyException handling
    /// Converts EF Core concurrency exception to user-friendly InvalidOperationException
    /// </summary>
    /// <param name="context">DbContext to save</param>
    /// <param name="entityName">Human-readable entity name for error messages</param>
    /// <param name="entityIdentifier">Entity identifier for logging</param>
    /// <param name="logger">Optional logger for warnings</param>
    /// <exception cref="InvalidOperationException">Thrown when concurrency conflict detected during save</exception>
    public static async Task SaveChangesWithConcurrencyCheckAsync(
        this DbContext context,
        string entityName,
        string entityIdentifier,
        ILogger? logger = null)
    {
        try
        {
            await context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException ex)
        {
            logger?.LogWarning(ex,
                "Concurrency conflict during save for {EntityType} {Identifier}",
                entityName, entityIdentifier);
            
            throw new InvalidOperationException(
                $"{entityName} '{entityIdentifier}' was modified by another user. Please refresh and try again.");
        }
    }
    
    /// <summary>
    /// Complete optimistic locking workflow: validate version, update entity, save with concurrency check
    /// Use this method in service Update methods for consistent concurrency handling
    /// </summary>
    /// <typeparam name="TEntity">Entity type with VersionNbr property</typeparam>
    /// <param name="context">DbContext to save</param>
    /// <param name="entity">The entity being updated</param>
    /// <param name="expectedVersion">The version number the client expects (optional)</param>
    /// <param name="entityName">Human-readable entity name for error messages</param>
    /// <param name="entityIdentifier">Entity identifier for logging</param>
    /// <param name="updateAction">Action to perform entity updates (before version increment)</param>
    /// <param name="logger">Optional logger for warnings</param>
    /// <exception cref="InvalidOperationException">Thrown when concurrency conflict detected</exception>
    public static async Task UpdateWithVersionCheckAsync<TEntity>(
        this DbContext context,
        TEntity entity,
        int? expectedVersion,
        string entityName,
        string entityIdentifier,
        Action<TEntity> updateAction,
        ILogger? logger = null) where TEntity : class
    {
        // Step 1: Validate version if provided
        entity.ValidateVersion(expectedVersion, entityName, entityIdentifier, logger);
        
        // Step 2: Get current version for logging
        var versionProperty = typeof(TEntity).GetProperty("VersionNbr");
        var originalVersion = (int?)versionProperty?.GetValue(entity) ?? 1;
        
        // Step 3: Apply updates (caller's custom logic)
        updateAction(entity);
        
        // Step 4: Increment version
        if (versionProperty != null)
        {
            var currentVersion = (int?)versionProperty.GetValue(entity) ?? 1;
            versionProperty.SetValue(entity, currentVersion + 1);
        }
        
        // Step 5: Save with concurrency check
        try
        {
            await context.SaveChangesAsync();
            
            var newVersion = (int?)versionProperty?.GetValue(entity) ?? 1;
            logger?.LogInformation(
                "{EntityType} {Identifier} updated from version {OldVersion} to {NewVersion}",
                entityName, entityIdentifier, originalVersion, newVersion);
        }
        catch (DbUpdateConcurrencyException ex)
        {
            logger?.LogWarning(ex,
                "Concurrency conflict during save for {EntityType} {Identifier} at version {Version}",
                entityName, entityIdentifier, originalVersion);
            
            throw new InvalidOperationException(
                $"{entityName} '{entityIdentifier}' was modified by another user. Please refresh and try again.");
        }
    }
}
