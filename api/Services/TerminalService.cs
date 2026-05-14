namespace PreOrderApp.Services;

using PreOrderApp.Data;
using PreOrderApp.DTOs;
using PreOrderApp.Models;
using Microsoft.EntityFrameworkCore;
using PreOrderApp.Infrastructure;

/// <summary>
/// Service for terminal CRUD operations
/// All queries are organization-scoped via org_id claim
/// Uses TerminalUid (UUID) for external API identification
/// Uses TerminalId (numeric PK) for database joins only
/// </summary>
public interface ITerminalService
{
    /// <summary>
    /// Get all (including soft-deleted) terminals for the organization
    /// </summary>
    Task<IEnumerable<TerminalDto>> GetAllAsync(Guid organizationId);

    /// <summary>
    /// Get all available (not soft-deleted) and not bound terminals available for use (assignment)
    /// </summary>
    Task<IEnumerable<TerminalDto>> GetAvailableAsync(Guid organizationId, Guid? deviceToken = null);

    /// <summary>
    /// Get all active  (not soft-deleted) terminals available for use
    /// </summary>
    Task<IEnumerable<TerminalDto>> GetActiveAsync(Guid organizationId);

    /// <summary>
    /// Get a specific terminal by its UUID external identifier
    /// </summary>
    Task<TerminalDto?> GetByUidAsync(Guid terminalUid, Guid organizationId);

    /// <summary>
    /// Create a new terminal for the organization
    /// </summary>
    Task<TerminalDto> CreateAsync(CreateTerminalRequest request, Guid organizationId);

    /// <summary>
    /// Update terminal properties
    /// </summary>
    Task<bool> UpdateAsync(Guid terminalUid, UpdateTerminalRequest request, Guid organizationId);

    /// <summary>
    /// Soft-delete terminal (set IsActive = false)
    /// Returns: (found, wasDeactivated) - wasDeactivated is true if it was just deactivated, false if already deactivated
    /// </summary>
    Task<(bool found, bool wasDeactivated)> DeactivateAsync(Guid terminalUid, Guid organizationId);

    /// <summary>
    /// Reactivate a deactivated terminal (set IsActive = true)
    /// Returns: (found, wasReactivated) - wasReactivated is true if it was just reactivated, false if already active
    /// </summary>
    Task<(bool found, bool wasReactivated)> ReactivateAsync(Guid terminalUid, Guid organizationId);
}

/// <summary>
/// Implementation of ITerminalService
/// </summary>
public class TerminalService : ITerminalService
{
    private readonly AppDbContext _context;
    private readonly ILogger<TerminalService> _logger;

        public TerminalService(AppDbContext context, ILogger<TerminalService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<TerminalDto>> GetAllAsync(Guid organizationId)
    {
        try
        {
            var terminals = await _context.Terminals
                .AsNoTracking()
                .Where(t => t.OrganizationId == organizationId)
                .OrderBy(t => t.TerminalCode)
                .Select(t => new TerminalDto
                {
                    TerminalUid = t.TerminalUid,
                    TerminalCode = t.TerminalCode,
                    Location = t.Location,
                    IsActive = t.IsActive,
                    CreatedAt = t.CreatedAt,
                    UpdatedAt = t.UpdatedAt
                })
                .ToListAsync();

            return terminals;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TerminalService.GetAllAsync] Error retrieving terminals for org {OrgId}", organizationId);
            throw;
        }
    }

    public async Task<IEnumerable<TerminalDto>> GetActiveAsync(Guid organizationId)
    {
        try
        {
            var terminals = await _context.Terminals
                .AsNoTracking()
                .Where(t => t.OrganizationId == organizationId && t.IsActive)
                .OrderBy(t => t.TerminalCode)
                .Select(t => new TerminalDto
                {
                    TerminalUid = t.TerminalUid,
                    TerminalCode = t.TerminalCode,
                    Location = t.Location,
                    IsActive = t.IsActive,
                    CreatedAt = t.CreatedAt,
                    UpdatedAt = t.UpdatedAt
                })
                .ToListAsync();

            return terminals;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TerminalService.GetActiveAsync] Error retrieving active terminals for org {OrgId}", organizationId);
            throw;
        }
    }

    public async Task<IEnumerable<TerminalDto>> GetAvailableAsync(Guid organizationId, Guid? deviceToken = null)
    {
        try
        {
            var terminals = await _context.Terminals
                .AsNoTracking()
                .Where(t => t.OrganizationId == organizationId && t.IsActive)
                .Where(t =>
                    !_context.TerminalDeviceBindings.Any(b =>
                        b.OrganizationId == organizationId
                        && b.TerminalId == t.TerminalId
                        && b.IsActive)
                    || (deviceToken.HasValue && _context.TerminalDeviceBindings.Any(b =>
                        b.OrganizationId == organizationId
                        && b.TerminalId == t.TerminalId
                        && b.IsActive
                        && b.DeviceToken == deviceToken.Value)))
                .OrderBy(t => t.TerminalCode)
                .Select(t => new TerminalDto
                {
                    TerminalUid = t.TerminalUid,
                    TerminalCode = t.TerminalCode,
                    Location = t.Location,
                    IsActive = t.IsActive,
                    CreatedAt = t.CreatedAt,
                    UpdatedAt = t.UpdatedAt
                })
                .ToListAsync();

            return terminals;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TerminalService.GetAvailableAsync] Error retrieving available terminals for org {OrgId}", organizationId);
            throw;
        }
    }

    public async Task<TerminalDto?> GetByUidAsync(Guid terminalUid, Guid organizationId)
    {
        try
        {
            var terminal = await _context.Terminals
                .FirstOrDefaultAsync(t => t.TerminalUid == terminalUid && t.OrganizationId == organizationId);

            if (terminal == null)
            {
                _logger.LogWarning("[TerminalService.GetByUidAsync] Terminal {TerminalUid} not found for org {OrgId}", terminalUid, organizationId);
                return null;
            }

            return new TerminalDto
            {
                TerminalUid = terminal.TerminalUid,
                TerminalCode = terminal.TerminalCode,
                Location = terminal.Location,
                IsActive = terminal.IsActive,
                CreatedAt = terminal.CreatedAt,
                UpdatedAt = terminal.UpdatedAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TerminalService.GetByUidAsync] Error retrieving terminal {TerminalUid} for org {OrgId}", terminalUid, organizationId);
            throw;
        }
    }

    public async Task<TerminalDto> CreateAsync(CreateTerminalRequest request, Guid organizationId)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.TerminalCode))
                throw new ArgumentException("TerminalCode is required");

            if (string.IsNullOrWhiteSpace(request.Location))
                throw new ArgumentException("Location is required");
            string sanitizedTerminalCode = StringSanitizer.SanitizeForLog(request.TerminalCode.Trim());

            var newTerminal = new Terminal
            {
                OrganizationId = organizationId,
                TerminalCode = sanitizedTerminalCode,
                Location = request.Location.Trim(),
                TerminalUid = Guid.NewGuid(),
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Terminals.Add(newTerminal);
            await _context.SaveChangesAsync();
             _logger.LogInformation("[TerminalService.CreateAsync] Created terminal {TerminalUid} ({TerminalCode}) for org {OrgId}",
                newTerminal.TerminalUid, sanitizedTerminalCode, organizationId);

            return new TerminalDto
            {
                TerminalUid = newTerminal.TerminalUid,
                TerminalCode = sanitizedTerminalCode,
                Location = newTerminal.Location,
                IsActive = newTerminal.IsActive,
                CreatedAt = newTerminal.CreatedAt,
                UpdatedAt = newTerminal.UpdatedAt
            };
        }
        catch (DbUpdateException ex) 
            when (ex.InnerException?.Message?.Contains("uk_terminal_org_code") == true)
            {
                string sanitizedTerminalCode = StringSanitizer.SanitizeForLog(request.TerminalCode.Trim());
                _logger.LogWarning("[TerminalService.CreateAsync] Duplicate terminal code '{TerminalCode}' for org {OrgId}", 
                    sanitizedTerminalCode, organizationId);
                throw new ArgumentException($"A terminal with code '{sanitizedTerminalCode}' already exists for this organization.");
            }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TerminalService.CreateAsync] Error creating terminal for org {OrgId}", organizationId);
            throw;
        }
    }

    public async Task<bool> UpdateAsync(Guid terminalUid, UpdateTerminalRequest request, Guid organizationId)
    {
        try
        {
            var terminal = await _context.Terminals
                .FirstOrDefaultAsync(t => t.TerminalUid == terminalUid && t.OrganizationId == organizationId);

            if (terminal == null)
            {
                _logger.LogWarning("[TerminalService.UpdateAsync] Terminal {TerminalUid} not found for org {OrgId}", terminalUid, organizationId);
                return false;
            }

            if (!string.IsNullOrWhiteSpace(request.TerminalCode))
                terminal.TerminalCode = request.TerminalCode.Trim();

            if (!string.IsNullOrWhiteSpace(request.Location))
                terminal.Location = request.Location.Trim();

            if (request.IsActive.HasValue)
                terminal.IsActive = request.IsActive.Value;

            terminal.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("[TerminalService.UpdateAsync] Updated terminal {TerminalUid} for org {OrgId}", terminalUid, organizationId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TerminalService.UpdateAsync] Error updating terminal {TerminalUid} for org {OrgId}", terminalUid, organizationId);
            throw;
        }
    }

    public async Task<(bool found, bool wasDeactivated)> DeactivateAsync(Guid terminalUid, Guid organizationId)
    {
        try
        {
            var terminal = await _context.Terminals
                .FirstOrDefaultAsync(t => t.TerminalUid == terminalUid && t.OrganizationId == organizationId);

            if (terminal == null)
            {
                _logger.LogWarning("[TerminalService.DeactivateAsync] Terminal {TerminalUid} not found for org {OrgId}", terminalUid, organizationId);
                return (false, false);
            }

            if (terminal.IsActive == false)
            {
                _logger.LogInformation("[TerminalService.DeactivateAsync] Terminal {TerminalUid} already deactivated for org {OrgId}", terminalUid, organizationId);
                return (true, false);
            }

            terminal.IsActive = false;
            terminal.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("[TerminalService.DeactivateAsync] Deactivated terminal {TerminalUid} for org {OrgId}", terminalUid, organizationId);
            return (true, true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TerminalService.DeactivateAsync] Error deactivating terminal {TerminalUid} for org {OrgId}", terminalUid, organizationId);
            throw;
        }
    }

    public async Task<(bool found, bool wasReactivated)> ReactivateAsync(Guid terminalUid, Guid organizationId)
    {
        try
        {
            var terminal = await _context.Terminals
                .FirstOrDefaultAsync(t => t.TerminalUid == terminalUid && t.OrganizationId == organizationId);

            if (terminal == null)
            {
                _logger.LogWarning("[TerminalService.ReactivateAsync] Terminal {TerminalUid} not found for org {OrgId}", terminalUid, organizationId);
                return (false, false);
            }

            if (terminal.IsActive == true)
            {
                _logger.LogInformation("[TerminalService.ReactivateAsync] Terminal {TerminalUid} already active for org {OrgId}", terminalUid, organizationId);
                return (true, false);
            }

            terminal.IsActive = true;
            terminal.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("[TerminalService.ReactivateAsync] Reactivated terminal {TerminalUid} for org {OrgId}", terminalUid, organizationId);
            return (true, true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TerminalService.ReactivateAsync] Error reactivating terminal {TerminalUid} for org {OrgId}", terminalUid, organizationId);
            throw;
        }
    }
}
