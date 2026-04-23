using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PreOrderApp.Models;

namespace PreOrderApp.Services;

/// <summary>
/// Service for managing terminal locks and logging terminal activity to AUDIT_LOG
/// Supports:
/// - Auto-lock after inactivity
/// - Manual lock/unlock by supervisors
/// - Activity audit trail (LOGIN, LOGOUT, CHANGE_USER, LOCK_TERMINAL, UNLOCK_TERMINAL)
/// </summary>
public interface ITerminalLockService
{
    /// <summary>
    /// Get the primary key TerminalId for a given TerminalUid (GUID)
    /// </summary>
    Task<Terminal?> GetTerminalByUidAsync(Guid organizationId, Guid terminalUid);

    /// <summary>
    /// Lock a terminal (manual or auto-lock)
    /// Logs LOCK_TERMINAL to AUDIT_LOG
    /// </summary>
    Task<bool> LockTerminalAsync(Guid organizationId, Guid terminalGuidId, Guid? lockedByUserId, string? reason = null);
    Task<bool> LockTerminalAsync(Guid organizationId, long terminalId, Guid? lockedByUserId, string? reason = null);

    /// <summary>
    /// Unlock a terminal (by PIN validation or admin force unlock)
    /// Logs UNLOCK_TERMINAL to AUDIT_LOG
    /// </summary>
    Task<bool> UnlockTerminalAsync(Guid organizationId, Guid terminalGuidId, Guid? lockedByUserId);
    Task<bool> UnlockTerminalAsync(Guid organizationId, long terminalId, Guid? lockedByUserId);

    /// <summary>
    /// Check if a terminal is currently locked
    /// </summary>
    Task<bool> IsTerminalLockedAsync(Guid organizationId, long terminalId);

    /// <summary>
    /// Get the current lock for a terminal (if locked)
    /// </summary>
    Task<TerminalSessionLock?> GetCurrentLockAsync(Guid organizationId, long terminalId);

    /// <summary>
    /// Get all currently locked terminals in an organization
    /// </summary>
    Task<List<(Terminal Terminal, TerminalSessionLock Lock)>> GetLockedTerminalsAsync(Guid organizationId);

    /// <summary>
    /// Log a terminal activity to AUDIT_LOG
    /// Actions: LOGIN, LOGOUT, CHANGE_USER, LOCK_TERMINAL, UNLOCK_TERMINAL
    /// </summary>
    Task LogActivityAsync(Guid organizationId, Guid terminalGuidId, Guid userId, string action);

    /// <summary>
    /// Get terminal by code (for resolving terminal_code to terminal_id)
    /// </summary>
    Task<Terminal?> GetTerminalByCodeAsync(Guid organizationId, string terminalCode);


    /// <summary>
    /// Activate a terminal session: unlock if previously locked, mark as active, and reset activity timestamp
    /// Called on user login to ensure terminal is ready for use
    /// </summary>
    Task<bool> ActivateTerminalSessionAsync(Guid organizationId, long terminalId);
    Task<bool> ActivateTerminalSessionAsync(Guid organizationId, Guid terminalGuid);

}
public class TerminalLockService : ITerminalLockService
{
    private readonly PreOrderApp.Data.AppDbContext _context;
    private readonly ILogger<TerminalLockService> _logger;

    /// <summary>
    /// Get the primary key TerminalId for a given TerminalUid (GUID)
    /// </summary>
    public async Task<Terminal?> GetTerminalByUidAsync(Guid organizationId, Guid terminalUid)
    {
        var terminal = await _context.Terminals
            .AsNoTracking()
            .Where(t => t.OrganizationId == organizationId && t.TerminalUid == terminalUid && t.IsActive)
            .FirstOrDefaultAsync();
        return terminal;
    }

    public TerminalLockService(PreOrderApp.Data.AppDbContext context, ILogger<TerminalLockService> logger)
    {
        _context = context;
        _logger = logger;
    }

    
    public async Task<bool> LockTerminalAsync(Guid organizationId, long terminalId, Guid? lockedByUserId, string? reason = null)
    {
        try
        {
            // Check if terminal already locked
            var terminal = await GetTerminalByIdAsync(organizationId, terminalId);
            if (terminal == null)
            {
                _logger.LogWarning("Terminal {terminalId} not found for organization: {OrgId} not found", terminalId, organizationId);
                return false;
            }

            var isLocked = await IsTerminalLockedAsync(organizationId, terminalId);

            if (isLocked)
            {
                _logger.LogWarning("Terminal {terminalGuidId} in org {OrgId} is already locked", terminal.TerminalUid, organizationId);
                return false;
            }

            // Find existing session lock (active or not locked)
            var existingLock = await _context.TerminalSessionLocks
                .FirstOrDefaultAsync(tsl => tsl.OrganizationId == organizationId && tsl.TerminalId == terminalId);

            if (existingLock != null)
            {
                // Update existing record to locked state
                existingLock.LockedAt = DateTime.UtcNow;
                existingLock.LockedByUserId = lockedByUserId;
                existingLock.LastActivityOn = DateTime.UtcNow;
                existingLock.StatusCd = "LOCKD";
                existingLock.SessionEndOn = DateTime.UtcNow; // End session on lock
                // Optionally update CreatedAt only if you want to track first creation
                // existingLock.CreatedAt = DateTime.UtcNow;
                _context.TerminalSessionLocks.Update(existingLock);
            }
            else
            {
                // Create new lock record
                var newLock = new TerminalSessionLock
                {
                    OrganizationId = organizationId,
                    TerminalId = terminalId,
                    LockedAt = DateTime.UtcNow,
                    LockedByUserId = lockedByUserId,
                    LastActivityOn = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    StatusCd = "LOCKD"
                };
                _context.TerminalSessionLocks.Add(newLock);
            }
            await _context.SaveChangesAsync();

            _logger.LogInformation("Terminal {terminalId} locked in org {OrgId} by user {UserId}. Reason: {Reason}",
                terminalId, organizationId, lockedByUserId ?? Guid.Empty, reason ?? "Unknown");

            // Log to AUDIT_LOG
            await LogActivityAsync(organizationId, terminalId, lockedByUserId ?? Guid.Empty, "LOCK_TERMINAL");

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error locking terminal {terminalId} in org {OrgId}", terminalId, organizationId);
            return false;
        }

    }
    public async Task<bool> LockTerminalAsync(Guid organizationId, Guid terminalGuidId, Guid? lockedByUserId, string? reason = null)
    {
        try
        {
            // Check if terminal already locked
            var terminal = await GetTerminalByUidAsync(organizationId, terminalGuidId);
            if (terminal == null)
            {
                _logger.LogWarning("Terminal {terminalGuidId} in org {OrgId} not found", terminalGuidId, organizationId);
                return false;
            }

            var terminalId = terminal.TerminalId;
            await LockTerminalAsync(organizationId, terminalId, lockedByUserId, reason);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error locking terminal {terminalGuidId} in org {OrgId}", terminalGuidId, organizationId);
            return false;
        }
    }

    public async Task<bool> UnlockTerminalAsync(Guid organizationId, Guid terminalGuid, Guid? unlockedByUserId)
    {
        try
        {
            // Find session lock record for this terminal
            var terminal = await GetTerminalByUidAsync(organizationId, terminalGuid);
            if (terminal == null)
            {
                _logger.LogWarning("Terminal {terminalGuid} in org {OrgId} not found", terminalGuid, organizationId);
                return false;
            }
            var terminalId = terminal.TerminalId;
            _logger.LogInformation("Unlocking terminal {terminalGuid} (ID: {terminalId}) in org {OrgId}", terminalGuid, terminalId, organizationId);
            await UnlockTerminalAsync(organizationId, terminalId, unlockedByUserId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unlocking terminal {terminalGuid} in org {OrgId}", terminalGuid, organizationId);
            return false;
        }
    }

    public async Task<bool> UnlockTerminalAsync(Guid organizationId, long terminalId, Guid? unlockedByUserId)
    {
        try
        {
            // Find session lock record for this terminal
            var terminal = await GetTerminalByIdAsync(organizationId, terminalId);
            if (terminal == null)
            {
                _logger.LogWarning("Terminal {terminalId} in org {OrgId} not found", terminalId, organizationId);
                return false;
            }
            var sessionLock = await _context.TerminalSessionLocks
                .FirstOrDefaultAsync(tsl => tsl.OrganizationId == organizationId && tsl.TerminalId == terminalId);

            if (sessionLock == null || sessionLock.LockedAt == null)
            {
                _logger.LogWarning("No active lock found for terminal {TerminalId} in org {OrgId}", terminalId, organizationId);
                return false;
            }

            // Record lock duration before unlocking
            var lockDurationMinutes = sessionLock.LockedDuration.TotalMinutes;

            // Unlock by nulling out LockedAt (preserve session record)
            await ActivateTerminalSessionAsync(organizationId, terminalId);

            _logger.LogInformation("Terminal {terminalGuid} unlocked in org {OrgId}. Locked for {Minutes} minutes", 
                terminal.TerminalUid, organizationId, lockDurationMinutes);

            // Log to AUDIT_LOG
            await LogActivityAsync(organizationId, terminalId, unlockedByUserId ?? Guid.Empty, "UNLOCK_TERMINAL");

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unlocking terminal {terminalId} in org {OrgId}", terminalId, organizationId);
            return false;
        }
    }

    public async Task<bool> IsTerminalLockedAsync(Guid organizationId, long terminalId)
    {
        try
        {            
            var isLocked = await _context.TerminalSessionLocks
                .AsNoTracking()
                .AnyAsync(tsl => tsl.OrganizationId == organizationId 
                              && tsl.TerminalId == terminalId
                              && tsl.LockedAt != null);

            return isLocked;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if terminal {terminalId} is locked", terminalId);
            return false;
        }
    }

    public async Task<TerminalSessionLock?> GetCurrentLockAsync(Guid organizationId, long terminalId)
    {
        try
        {
            var activeLock = await _context.TerminalSessionLocks
                .Where(tsl => tsl.OrganizationId == organizationId 
                           && tsl.TerminalId == terminalId)
                .FirstOrDefaultAsync();

            return activeLock;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting current lock for terminal {TerminalId}", terminalId);
            return null;
        }
    }

    public async Task<List<(Terminal Terminal, TerminalSessionLock Lock)>> GetLockedTerminalsAsync(Guid organizationId)
    {
        try
        {
            var lockedTerminals = await _context.TerminalSessionLocks
                .Where(tsl => tsl.OrganizationId == organizationId && tsl.LockedAt != null)
                .Include(tsl => tsl.Terminal)
                .Select(tsl => new { Terminal = tsl.Terminal!, Lock = tsl })
                .ToListAsync();

            return lockedTerminals.Select(x => (x.Terminal, x.Lock)).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting locked terminals for org {OrgId}", organizationId);
            return new List<(Terminal, TerminalSessionLock)>();
        }
    }
    public async Task LogActivityAsync(Guid organizationId, Guid terminalGuidId, Guid userId, string action)
    {
        try
        {
            // Get terminal info for audit log
            var terminal = await GetTerminalByUidAsync(organizationId, terminalGuidId);
            if (terminal == null)
            {
                _logger.LogWarning("Terminal {terminalGuidId} in org {OrgId} not found for logging", terminalGuidId, organizationId);
                return;
            }
            await LogActivityAsync(organizationId, terminal.TerminalId, userId, action);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging terminal activity {Action} for terminal {TerminalGuidId}", action, terminalGuidId);
        }
        
    }
    public async Task LogActivityAsync(Guid organizationId, long terminalId, Guid userId, string action)
    {
        try
        {
            // Get terminal info for audit log
            var terminal = await _context.Terminals.FirstOrDefaultAsync(t => t.TerminalId == terminalId);
            
            var auditLog = new AuditLog
            {
                UserId = userId == Guid.Empty ? null : userId,
                OrganizationId = organizationId,
                Action = action,
                EntityType = "TERMINAL",
                EntityId = terminal?.TerminalCode ?? terminalId.ToString(),
                Details = JsonSerializer.Serialize(new 
                { 
                    terminalId,
                    terminalCode = terminal?.TerminalCode,
                    location = terminal?.Location
                }),
                IpAddress = null,  // Set by controller if available
                UserAgent = null,  // Set by controller if available
                Timestamp = DateTime.UtcNow
            };

            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Logged activity {Action} for terminal {TerminalCode} by user {UserId}", 
                action, terminal?.TerminalCode, userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging terminal activity {Action} for terminal {TerminalId}", action, terminalId);
        }
    }


    public async Task<Terminal?> GetTerminalByIdAsync(Guid organizationId, long terminalId)
    {
        try
        {
            var terminal = await _context.Terminals
                .Where(t => t.OrganizationId == organizationId && t.TerminalId == terminalId && t.IsActive)
                .FirstOrDefaultAsync();

            return terminal;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting terminal by id {TerminalId} in org {OrgId}", terminalId, organizationId);
            return null;
        }
    }

    public async Task<Terminal?> GetTerminalByCodeAsync(Guid organizationId, string terminalCode)
    {
        try
        {
            var terminal = await _context.Terminals
                .AsNoTracking()
                .Where(t => t.OrganizationId == organizationId && t.TerminalCode == terminalCode && t.IsActive)
                .FirstOrDefaultAsync();

            return terminal;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting terminal by code {TerminalCode} in org {OrgId}", terminalCode, organizationId);
            return null;
        }
    }

    // When a terminal is activated it is unlocked, the session begins, and the session becomes active "ACTV"
    public async Task<bool> ActivateTerminalSessionAsync(Guid organizationId, Guid terminalGuid)
    {
        try
        {
            var terminal = await GetTerminalByUidAsync(organizationId, terminalGuid);
            if (terminal == null)
            {
                _logger.LogWarning("Terminal {terminalGuid} in org {OrgId} not found", terminalGuid, organizationId);
                return false;
            }
            return await ActivateTerminalSessionAsync(organizationId, terminal.TerminalId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error activating terminal session {terminalGuid} in org {OrgId}", terminalGuid, organizationId);
            return false;
        }
    }

    public async Task<bool> ActivateTerminalSessionAsync(Guid organizationId, long terminalId)
    {
        try
        {
            _logger.LogInformation("Activating terminal session for TerminalID: {terminalId} OrgId: {OrgId} ",terminalId, organizationId);
            var _newSessionTime = DateTime.UtcNow;
            var existingLock = await _context.TerminalSessionLocks
                .FirstOrDefaultAsync(tsl => tsl.OrganizationId == organizationId && tsl.TerminalId == terminalId);

            if (existingLock != null)
            {
                // Update existing lock: unlock terminal, mark as active, and reset activity timestamp
                existingLock.LockedAt = null;
                existingLock.LockedByUserId = null;
                existingLock.LastActivityOn = _newSessionTime;
                existingLock.SessionBeginOn = _newSessionTime;
                existingLock.SessionEndOn = null;
                existingLock.StatusCd = "ACTV";
            }
            else
            {
                // Create new terminal session lock record (not locked, marked as active)
                var newLock = new TerminalSessionLock
                {
                    OrganizationId = organizationId,
                    TerminalId = terminalId,
                    LockedAt = null,
                    LockedByUserId = null,
                    StatusCd = "ACTV",
                    LastActivityOn = _newSessionTime,
                    CreatedAt = _newSessionTime
                };
                _context.TerminalSessionLocks.Add(newLock);
            }
            await _context.SaveChangesAsync();

            _logger.LogInformation("Terminal {TerminalId} session activated in org {OrgId}", terminalId, organizationId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error activating terminal session {TerminalId} in org {OrgId}", terminalId, organizationId);
            return false;
        }
    }
}
