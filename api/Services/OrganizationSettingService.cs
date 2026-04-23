using Microsoft.EntityFrameworkCore;
using OrderMgmt.Models;

namespace OrderMgmt.Services;

/// <summary>
/// Service for managing organization-level settings as key-value pairs
/// Supports per-org configuration without code redeploy
/// Examples: inactivity_threshold_minutes, session_timeout, feature_flags
/// </summary>
public interface IOrganizationSettingService
{
    /// <summary>
    /// Get a setting value for an organization
    /// Returns null if not found
    /// </summary>
    Task<string?> GetSettingAsync(Guid organizationId, string key);

    /// <summary>
    /// Get a setting value as integer
    /// Returns defaultValue if not found or not parseable
    /// </summary>
    Task<int> GetSettingAsIntAsync(Guid organizationId, string key, int defaultValue = 0);

    /// <summary>
    /// Get a setting value as boolean
    /// Returns defaultValue if not found or not parseable
    /// </summary>
    Task<bool> GetSettingAsBoolAsync(Guid organizationId, string key, bool defaultValue = false);

    /// <summary>
    /// Set or update a setting for an organization
    /// </summary>
    Task<bool> SetSettingAsync(Guid organizationId, string key, string value, Guid? updatedBy = null);

    /// <summary>
    /// Get the inactivity threshold (in minutes) for terminal auto-lock
    /// Default: 110 minutes (1 hour 50 minutes)
    /// </summary>
    Task<int> GetInactivityThresholdAsync(Guid organizationId);

    /// <summary>
    /// Set the inactivity threshold (in minutes)
    /// </summary>
    Task<bool> SetInactivityThresholdAsync(Guid organizationId, int minutes, Guid? updatedBy = null);

    /// <summary>
    /// Initialize default settings for a new organization
    /// Should be called during organization registration
    /// </summary>
    Task<bool> InitializeDefaultSettingsAsync(Guid organizationId, Guid createdBy);
}

public class OrganizationSettingService : IOrganizationSettingService
{
    private readonly OrderMgmt.Data.OrderMgmtDbContext _context;
    private readonly ILogger<OrganizationSettingService> _logger;

    // Default values
    private const int DEFAULT_INACTIVITY_THRESHOLD_MINUTES = 110;

    public OrganizationSettingService(OrderMgmt.Data.OrderMgmtDbContext context, ILogger<OrganizationSettingService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<string?> GetSettingAsync(Guid organizationId, string key)
    {
        try
        {
            var setting = await _context.OrganizationSettings
                .Where(os => os.OrganizationId == organizationId && os.SettingKey == key)
                .FirstOrDefaultAsync();

            return setting?.SettingValue;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting setting {Key} for org {OrgId}", key, organizationId);
            return null;
        }
    }

    public async Task<int> GetSettingAsIntAsync(Guid organizationId, string key, int defaultValue = 0)
    {
        try
        {
            var value = await GetSettingAsync(organizationId, key);
            if (string.IsNullOrEmpty(value))
                return defaultValue;

            if (int.TryParse(value, out var result))
                return result;

            _logger.LogWarning("Setting {Key} for org {OrgId} is not a valid integer: {Value}", key, organizationId, value);
            return defaultValue;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing setting {Key} as integer for org {OrgId}", key, organizationId);
            return defaultValue;
        }
    }

    public async Task<bool> GetSettingAsBoolAsync(Guid organizationId, string key, bool defaultValue = false)
    {
        try
        {
            var value = await GetSettingAsync(organizationId, key);
            if (string.IsNullOrEmpty(value))
                return defaultValue;

            return value.ToLower() == "true" || value == "1";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing setting {Key} as boolean for org {OrgId}", key, organizationId);
            return defaultValue;
        }
    }

    public async Task<bool> SetSettingAsync(Guid organizationId, string key, string value, Guid? updatedBy = null)
    {
        try
        {
            var existingSetting = await _context.OrganizationSettings
                .Where(os => os.OrganizationId == organizationId && os.SettingKey == key)
                .FirstOrDefaultAsync();

            if (existingSetting != null)
            {
                // Update existing
                existingSetting.SettingValue = value;
                existingSetting.UpdatedBy = updatedBy;
                existingSetting.UpdatedAt = DateTime.UtcNow;
                existingSetting.VersionNbr++;
            }
            else
            {
                // Create new
                var newSetting = new OrganizationSetting
                {
                    OrganizationId = organizationId,
                    SettingKey = key,
                    SettingValue = value,
                    CreatedBy = updatedBy,
                    UpdatedBy = updatedBy,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    VersionNbr = 1
                };
                _context.OrganizationSettings.Add(newSetting);
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Set setting {Key}={Value} for org {OrgId}", key, value, organizationId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting {Key} for org {OrgId}", key, organizationId);
            return false;
        }
    }

    public async Task<int> GetInactivityThresholdAsync(Guid organizationId)
    {
        return await GetSettingAsIntAsync(organizationId, "inactivity_threshold_minutes", DEFAULT_INACTIVITY_THRESHOLD_MINUTES);
    }

    public async Task<bool> SetInactivityThresholdAsync(Guid organizationId, int minutes, Guid? updatedBy = null)
    {
        if (minutes < 5 || minutes > 1440)  // 5 minutes to 24 hours
        {
            _logger.LogWarning("Invalid inactivity threshold {Minutes} for org {OrgId}", minutes, organizationId);
            return false;
        }

        return await SetSettingAsync(organizationId, "inactivity_threshold_minutes", minutes.ToString(), updatedBy);
    }

    public async Task<bool> InitializeDefaultSettingsAsync(Guid organizationId, Guid createdBy)
    {
        try
        {
            // Check if already initialized
            var existing = await _context.OrganizationSettings
                .AnyAsync(os => os.OrganizationId == organizationId);

            if (existing)
            {
                _logger.LogWarning("Organization {OrgId} already has settings initialized", organizationId);
                return true;  // Already initialized, not an error
            }

            // Initialize default inactivity threshold
            await SetSettingAsync(organizationId, "inactivity_threshold_minutes", DEFAULT_INACTIVITY_THRESHOLD_MINUTES.ToString(), createdBy);

            _logger.LogInformation("Initialized default settings for org {OrgId}", organizationId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initializing default settings for org {OrgId}", organizationId);
            return false;
        }
    }
}
