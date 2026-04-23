using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using OrderMgmt.Data;
using OrderMgmt.DTOs;
using OrderMgmt.Models;

namespace OrderMgmt.Services;

public interface IPinAdminService
{
    Task<PinUserDto?> GetPinUserByIdAsync(Guid userId, Guid organizationId);
    Task<List<PinUserDto>> GetAllPinUsersAsync(Guid organizationId);
    Task<PinUserDto> CreatePinUserAsync(CreatePinUserRequest request, Guid organizationId, string createdBy);
    Task<PinUserDto> UpdatePinUserAsync(Guid userId, UpdatePinUserRequest request, Guid organizationId, string updatedBy);
    Task ResetPinAsync(Guid userId, Guid organizationId, string performedBy);
    Task UnlockUserAsync(Guid userId, Guid organizationId, string performedBy);
    Task<List<AdminAuditLogDto>> GetAuditLogsAsync(Guid organizationId, DateTime? startDate, DateTime? endDate);
    Task LogAdminActionAsync(string action, string details, Guid organizationId, string performedBy);
}

public class PinAdminService : IPinAdminService
{
    private readonly OrderMgmtDbContext _context;
    private readonly ILogger<PinAdminService> _logger;

    public PinAdminService(OrderMgmtDbContext context, ILogger<PinAdminService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<PinUserDto?> GetPinUserByIdAsync(Guid userId, Guid organizationId)
    {
        try
        {
            var user = await _context.SystemUsers
                .Where(u => u.UserId == userId && u.OrganizationId == organizationId)
                .FirstOrDefaultAsync();

            if (user == null)
                return null;

            return MapToPinUserDto(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting PIN user");
            throw;
        }
    }

    public async Task<List<PinUserDto>> GetAllPinUsersAsync(Guid organizationId)
    {
        try
        {
            var users = await _context.SystemUsers
                .Where(u => u.OrganizationId == organizationId && u.PinHash != null)
                .ToListAsync();

            return users.Select(MapToPinUserDto).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting PIN users");
            throw;
        }
    }

    public async Task<PinUserDto> CreatePinUserAsync(CreatePinUserRequest request, Guid organizationId, string createdBy)
    {
        try
        {
            var pin = GenerateRandomPin();
            var pinHash = BCrypt.Net.BCrypt.HashPassword(pin);

            var user = await _context.SystemUsers
                .Where(u => u.UserId == request.UserId && u.OrganizationId == organizationId)
                .FirstOrDefaultAsync();

            if (user == null)
                throw new InvalidOperationException("User not found");

            user.PinHash = pinHash;
            user.PinAttempts = 0;
            user.PinSetOn = DateTime.UtcNow;
            user.PinLockedUntil = null;

            await _context.SaveChangesAsync();

            await LogAdminActionAsync("CREATE_PIN_USER", $"Created PIN for user {user.UserId}", organizationId, createdBy);

            return MapToPinUserDto(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating PIN user");
            throw;
        }
    }

    public async Task<PinUserDto> UpdatePinUserAsync(Guid userId, UpdatePinUserRequest request, Guid organizationId, string updatedBy)
    {
        try
        {
            var user = await _context.SystemUsers
                .Where(u => u.UserId == userId && u.OrganizationId == organizationId)
                .FirstOrDefaultAsync();

            if (user == null)
                throw new InvalidOperationException("User not found");

            if (!string.IsNullOrEmpty(request.FirstName))
                user.FirstName = request.FirstName;
            if (!string.IsNullOrEmpty(request.LastName))
                user.LastName = request.LastName;
            if (!string.IsNullOrEmpty(request.EmailAddress))
                user.EmailAddress = request.EmailAddress;

            await _context.SaveChangesAsync();

            await LogAdminActionAsync("UPDATE_PIN_USER", $"Updated user {user.UserId}", organizationId, updatedBy);

            return MapToPinUserDto(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating PIN user");
            throw;
        }
    }

    public async Task ResetPinAsync(Guid userId, Guid organizationId, string performedBy)
    {
        try
        {
            var user = await _context.SystemUsers
                .Where(u => u.UserId == userId && u.OrganizationId == organizationId)
                .FirstOrDefaultAsync();

            if (user == null)
                throw new InvalidOperationException("User not found");

            var newPin = GenerateRandomPin();
            user.PinHash = BCrypt.Net.BCrypt.HashPassword(newPin);
            user.PinAttempts = 0;
            user.PinLockedUntil = null;

            await _context.SaveChangesAsync();

            await LogAdminActionAsync("RESET_PIN", $"Reset PIN for user {userId}", organizationId, performedBy);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting PIN");
            throw;
        }
    }

    public async Task UnlockUserAsync(Guid userId, Guid organizationId, string performedBy)
    {
        try
        {
            var user = await _context.SystemUsers
                .Where(u => u.UserId == userId && u.OrganizationId == organizationId)
                .FirstOrDefaultAsync();

            if (user == null)
                throw new InvalidOperationException("User not found");

            user.PinAttempts = 0;
            user.PinLockedUntil = null;

            await _context.SaveChangesAsync();

            await LogAdminActionAsync("UNLOCK_USER", $"Unlocked user {userId}", organizationId, performedBy);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unlocking user");
            throw;
        }
    }

    public async Task<List<AdminAuditLogDto>> GetAuditLogsAsync(Guid organizationId, DateTime? startDate, DateTime? endDate)
    {
        try
        {
            var query = _context.AdminAuditLogs
                .Where(log => log.OrganizationId == organizationId);

            if (startDate.HasValue)
                query = query.Where(log => log.LoggedAt >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(log => log.LoggedAt <= endDate.Value);

            var logs = await query
                .OrderByDescending(log => log.LoggedAt)
                .ToListAsync();

            return logs.Select(log => new AdminAuditLogDto
            {
                AuditLogId = log.Id,
                Action = log.Action ?? string.Empty,
                Details = log.Details ?? string.Empty,
                PerformedBy = log.PerformedBy ?? string.Empty,
                LoggedAt = log.LoggedAt
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting audit logs");
            throw;
        }
    }

    public async Task LogAdminActionAsync(string action, string details, Guid organizationId, string performedBy)
    {
        try
        {
            var auditLog = new AdminAuditLog
            {
                Id = Guid.NewGuid(),
                OrganizationId = organizationId,
                Action = action,
                Details = details,
                PerformedBy = performedBy,
                LoggedAt = DateTime.UtcNow
            };

            _context.AdminAuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging admin action");
            // Don't throw - audit logging shouldn't break the main operation
        }
    }

    private PinUserDto MapToPinUserDto(SystemUser user)
    {
        var isLocked = user.PinLockedUntil.HasValue && user.PinLockedUntil > DateTime.UtcNow;

        return new PinUserDto
        {
            UserId = user.UserId,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.EmailAddress,
            HasPinEnabled = !string.IsNullOrEmpty(user.PinHash),
            IsLocked = isLocked,
            PinAttempts = user.PinAttempts,
            PinSetOn = user.PinSetOn
        };
    }

    private string GenerateRandomPin()
    {
        var random = new Random();
        return random.Next(100000, 999999).ToString();
    }
}
