using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using PreOrderApp.Data;
using PreOrderApp.DTOs;
using PreOrderApp.Models;

namespace PreOrderApp.Services;

public interface ITerminalDeviceBindingService
{
    Task<BindDeviceResponse> BindDeviceAsync(Guid terminalUid, Guid? deviceToken, Guid userId, Guid organizationId);
    Task<bool> UnbindDeviceAsync(Guid terminalUid, Guid deviceToken, Guid userId, Guid organizationId);
    Task<CheckBindingResponse> CheckBindingAsync(Guid terminalUid, Guid? deviceToken, Guid organizationId);
    Task UpdateLastSeenAsync(Guid deviceToken, Guid organizationId);
    Task<List<TerminalDeviceBindingDto>> GetActiveBindingsForTerminalAsync(Guid terminalUid, Guid organizationId);
    Task<bool> AdminReleaseDeviceAsync(long terminalDeviceBindingId, Guid adminUserId, Guid organizationId);
    Task<TerminalDto?> GetCurrentBoundTerminalAsync(Guid deviceToken, Guid organizationId);
    /// <summary>Lookup terminal + org from device_token alone — no auth required.</summary>
    Task<DeviceContextDto?> GetDeviceContextAsync(Guid deviceToken);
    /// <summary>Release the active device binding for this device_token — no auth required.</summary>
    Task<bool> ReleaseDeviceContextAsync(Guid deviceToken);
}

public class TerminalDeviceBindingService : ITerminalDeviceBindingService
{
    private readonly AppDbContext _context;
    private readonly IAuditService _auditLog;
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _configuration;
    private readonly ILogger<TerminalDeviceBindingService> _logger;

    public TerminalDeviceBindingService(
        AppDbContext context,
        IAuditService auditLog,
        IMemoryCache cache,
        IConfiguration configuration,
        ILogger<TerminalDeviceBindingService> logger)
    {
        _context = context;
        _auditLog = auditLog;
        _cache = cache;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Revoke a UserSession by its SessionId (marks IsActive = false).
    /// Safe to call with a null ID — does nothing.
    /// </summary>
    private async Task RevokeSessionAsync(Guid? sessionId, string reason)
    {
        if (!sessionId.HasValue) return;

        var session = await _context.UserSessions
            .FirstOrDefaultAsync(s => s.SessionId == sessionId.Value && s.IsActive);

        if (session == null) return;

        session.IsActive = false;
        await _context.SaveChangesAsync();
        _logger.LogInformation("Session {SessionId} revoked: {Reason}", sessionId, reason);
    }

    /// <summary>
    /// Bind a device to a terminal (new or existing device token)
    /// Handles takeover scenario when device token switches terminals
    /// </summary>
    public async Task<BindDeviceResponse> BindDeviceAsync(
        Guid terminalUid,
        Guid? deviceToken,
        Guid userId,
        Guid organizationId)
    {
        var terminal = await _context.Terminals
            .Where(t => t.TerminalUid == terminalUid && t.OrganizationId == organizationId && t.IsActive)
            .FirstOrDefaultAsync();

        if (terminal == null)
        {
            throw new InvalidOperationException($"Terminal '{terminalUid}' not found or inactive");
        }

        EnforceBindRateLimit(userId, organizationId);
        EnforceBindCooldown(userId, organizationId);

        var isNewBinding = !deviceToken.HasValue;
        var takeoverOccurred = false;
        Guid? previousDeviceToken = null;

        // Resolve token — generate new one if this is a first-time bind
        var resolvedToken = deviceToken ?? Guid.NewGuid();

        // Check if target terminal already has a DIFFERENT device bound to it
        var terminalCurrentBinding = await _context.TerminalDeviceBindings
            .Where(b => b.TerminalId == terminal.TerminalId
                     && b.OrganizationId == organizationId
                     && b.IsActive
                     && b.DeviceToken != resolvedToken)
            .FirstOrDefaultAsync();

        if (terminalCurrentBinding != null)
        {
            if (terminalCurrentBinding.BoundByUserId == userId)
            {
                // Same user re-binding (e.g. cookie was cleared, new device token generated).
                // Auto-release the stale binding so the new one can proceed.
                terminalCurrentBinding.IsActive = false;
                terminalCurrentBinding.UnboundAt = DateTime.UtcNow;
                terminalCurrentBinding.UnboundByUserId = userId;
                terminalCurrentBinding.UpdatedAt = DateTime.UtcNow;

                _logger.LogInformation(
                    "Same-user re-bind: Released stale binding {BindingId} for user {UserId} on terminal {TerminalUid}",
                    terminalCurrentBinding.TerminalDeviceBindingId, userId, terminalUid);
            }
            else
            {
                throw new InvalidOperationException(
                    $"Terminal '{terminal.TerminalCode}' is already bound to another device. " +
                    $"Use admin force release to unbind it first.");
            }
        }

        // Prevent the same device token from being active across multiple organizations.
        // This enforces one active organization context per device token.
        var crossOrgBinding = await _context.TerminalDeviceBindings
            .Where(b => b.DeviceToken == resolvedToken
                     && b.IsActive
                     && b.OrganizationId != organizationId)
            .AsNoTracking()
            .FirstOrDefaultAsync();

        if (crossOrgBinding != null)
        {
            throw new InvalidOperationException(
                "This device is already bound to an organization. " +
                "Please unbind it from the current organization before binding here.");
        }

        // Check if device is already bound to a DIFFERENT terminal
        var existingBinding = await _context.TerminalDeviceBindings
            .Where(b => b.DeviceToken == resolvedToken
                     && b.OrganizationId == organizationId 
                     && b.IsActive)
            .FirstOrDefaultAsync();

        if (existingBinding != null && existingBinding.TerminalId != terminal.TerminalId)
        {
            // TAKEOVER: Device switching terminals — kill the old session first
            takeoverOccurred = true;
            previousDeviceToken = existingBinding.DeviceToken;

            // Revoke the session that was active when the old binding was created
            await RevokeSessionAsync(existingBinding.SessionId, "terminal_takeover");

            // Deactivate old binding
            existingBinding.IsActive = false;
            existingBinding.UnboundAt = DateTime.UtcNow;
            existingBinding.UnboundByUserId = userId;
            existingBinding.UpdatedAt = DateTime.UtcNow;

            // Log takeover event
            await _auditLog.LogEventAsync(
                action: "DEVICE_TAKEOVER",
                userId: userId,
                organizationId: organizationId,
                entityType: "TerminalDeviceBinding",
                entityId: existingBinding.TerminalDeviceBindingId.ToString(),
                ipAddress: null,
                userAgent: null,
                details: $"Device token {resolvedToken} moved from terminal {existingBinding.TerminalId} to {terminal.TerminalId}");

            _logger.LogInformation("Device takeover: Device {DeviceToken} moved from terminal {OldTerminal} to {NewTerminal}",
                resolvedToken, existingBinding.TerminalId, terminal.TerminalId);
        }
        else if (existingBinding != null && existingBinding.TerminalId == terminal.TerminalId)
        {
            // Already bound to same terminal - just update last seen
            existingBinding.LastSeenAt = DateTime.UtcNow;
            existingBinding.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new BindDeviceResponse
            {
                DeviceToken = resolvedToken,
                TerminalId = terminal.TerminalId,
                TerminalCode = terminal.TerminalCode,
                IsNewBinding = false,
                TakeoverOccurred = false
            };
        }

        // Resolve the current active session for this user so we can kill it later if the terminal is taken over
        var currentSession = await _context.UserSessions
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.IsActive && s.ExpiresOn > DateTime.UtcNow)
            .OrderByDescending(s => s.CreatedOn)
            .FirstOrDefaultAsync();

        // Create new binding
        var newBinding = new TerminalDeviceBinding
        {
            OrganizationId = organizationId,
            TerminalId = terminal.TerminalId,
            DeviceToken = resolvedToken,
            BoundByUserId = userId,
            SessionId = currentSession?.SessionId,
            BoundAt = DateTime.UtcNow,
            LastSeenAt = DateTime.UtcNow,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.TerminalDeviceBindings.Add(newBinding);
        await _context.SaveChangesAsync();

        SetBindCooldown(userId, organizationId);

        _logger.LogInformation("Device bound: {DeviceToken} to terminal {TerminalUid} by user {UserId}",
            resolvedToken, terminalUid, userId);

        return new BindDeviceResponse
        {
            DeviceToken = resolvedToken,
            TerminalId = terminal.TerminalId,
            TerminalCode = terminal.TerminalCode,
            IsNewBinding = isNewBinding,
            TakeoverOccurred = takeoverOccurred,
            PreviousDeviceToken = previousDeviceToken
        };
    }

    /// <summary>
    /// Explicitly unbind device from terminal (user-initiated logout/unbind)
    /// </summary>
    public async Task<bool> UnbindDeviceAsync(
        Guid terminalUid,
        Guid deviceToken,
        Guid userId,
        Guid organizationId)
    {
        var binding = await _context.TerminalDeviceBindings
            .Where(b => b.DeviceToken == deviceToken
                     && b.OrganizationId == organizationId
                     && b.IsActive)
            .Include(b => b.Terminal)
            .FirstOrDefaultAsync();

        if (binding == null || binding.Terminal?.TerminalUid != terminalUid)
        {
            return false; // No active binding found
        }

        // Revoke the session that was active when this binding was created
        await RevokeSessionAsync(binding.SessionId, "device_unbind");

        binding.IsActive = false;
        binding.BoundAt = null;
        binding.BoundByUserId = null;
        binding.DeviceToken = null;
        binding.UnboundAt = DateTime.UtcNow;
        binding.UnboundByUserId = userId;
        binding.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Device unbound: {DeviceToken} from terminal {TerminalUid} by user {UserId}",
            deviceToken, terminalUid, userId);

        return true;
    }

    /// <summary>
    /// Check if device is bound to terminal
    /// </summary>
    public async Task<CheckBindingResponse> CheckBindingAsync(
        Guid terminalUid,
        Guid? deviceToken,
        Guid organizationId)
    {
        if (!deviceToken.HasValue)
        {
            return new CheckBindingResponse { IsBound = false };
        }

        var binding = await _context.TerminalDeviceBindings
            .Where(b => b.DeviceToken == deviceToken
                     && b.OrganizationId == organizationId
                     && b.IsActive)
            .Include(b => b.Terminal)
            .FirstOrDefaultAsync();

        if (binding == null)
        {
            return new CheckBindingResponse { IsBound = false };
        }

        return new CheckBindingResponse
        {
            IsBound = binding.Terminal?.TerminalUid == terminalUid,
            DeviceToken = binding.DeviceToken,
            TerminalId = binding.TerminalId,
            TerminalCode = binding.Terminal?.TerminalCode,
            BoundAt = binding.BoundAt,
            LastSeenAt = binding.LastSeenAt
        };
    }

    /// <summary>
    /// Update last seen timestamp for device (called by middleware on eligible API requests; throttled)
    /// </summary>
    public async Task UpdateLastSeenAsync(Guid deviceToken, Guid organizationId)
    {
        var binding = await _context.TerminalDeviceBindings
            .Where(b => b.DeviceToken == deviceToken
                     && b.OrganizationId == organizationId
                     && b.IsActive)
            .FirstOrDefaultAsync();

        if (binding != null)
        {
            binding.LastSeenAt = DateTime.UtcNow;
            binding.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Get all active bindings for a terminal (admin view)
    /// </summary>
    public async Task<List<TerminalDeviceBindingDto>> GetActiveBindingsForTerminalAsync(
        Guid terminalUid,
        Guid organizationId)
    {
        return await _context.TerminalDeviceBindings
            .Where(b => b.Terminal!.TerminalUid == terminalUid
                     && b.OrganizationId == organizationId
                     && b.IsActive)
            .Include(b => b.Terminal)
            .Select(b => new TerminalDeviceBindingDto
            {
                TerminalDeviceBindingId = b.TerminalDeviceBindingId,
                OrganizationId = b.OrganizationId,
                TerminalId = b.TerminalId,
                TerminalCode = b.Terminal!.TerminalCode,
                DeviceToken = b.DeviceToken,
                BoundByUserId = b.BoundByUserId,
                SessionId = b.SessionId,
                BoundAt = b.BoundAt,
                LastSeenAt = b.LastSeenAt,
                UnboundAt = b.UnboundAt,
                UnboundByUserId = b.UnboundByUserId,
                IsActive = b.IsActive
            })
            .ToListAsync();
    }

    /// <summary>
    /// Admin: Force release a device binding (for stuck devices or troubleshooting)
    /// </summary>
    public async Task<bool> AdminReleaseDeviceAsync(
        long terminalDeviceBindingId,
        Guid adminUserId,
        Guid organizationId)
    {
        var binding = await _context.TerminalDeviceBindings
            .Where(b => b.TerminalDeviceBindingId == terminalDeviceBindingId
                     && b.OrganizationId == organizationId
                     && b.IsActive)
            .FirstOrDefaultAsync();

        if (binding == null)
        {
            return false;
        }

        // Revoke the session that was active when this binding was created
        await RevokeSessionAsync(binding.SessionId, "admin_release");

        binding.IsActive = false;
        binding.UnboundAt = DateTime.UtcNow;
        binding.UnboundByUserId = adminUserId;
        binding.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Log admin action
        await _auditLog.LogEventAsync(
            action: "DEVICE_ADMIN_RELEASE",
            userId: adminUserId,
            organizationId: organizationId,
            entityType: "TerminalDeviceBinding",
            entityId: terminalDeviceBindingId.ToString(),
            ipAddress: null,
            userAgent: null,
            details: $"Admin forcibly released device token {binding.DeviceToken} from terminal {binding.TerminalId}");

        _logger.LogWarning("Admin {AdminUserId} forcibly released device {DeviceToken} from binding {BindingId}",
            adminUserId, binding.DeviceToken, terminalDeviceBindingId);

        return true;
    }

    public async Task<TerminalDto?> GetCurrentBoundTerminalAsync(Guid deviceToken, Guid organizationId)
    {
        var binding = await _context.TerminalDeviceBindings
            .AsNoTracking()
            .Where(b => b.DeviceToken == deviceToken
                     && b.OrganizationId == organizationId
                     && b.IsActive)
            .Include(b => b.Terminal)
            .FirstOrDefaultAsync();

        if (binding?.Terminal == null || !binding.Terminal.IsActive)
        {
            return null;
        }

        return new TerminalDto
        {
            TerminalUid = binding.Terminal.TerminalUid,
            TerminalCode = binding.Terminal.TerminalCode,
            Location = binding.Terminal.Location,
            IsActive = binding.Terminal.IsActive,
            CreatedAt = binding.Terminal.CreatedAt,
            UpdatedAt = binding.Terminal.UpdatedAt
        };
    }

    public async Task<DeviceContextDto?> GetDeviceContextAsync(Guid deviceToken)
    {
        var binding = await _context.TerminalDeviceBindings
            .AsNoTracking()
            .Where(b => b.DeviceToken == deviceToken && b.IsActive)
            .Include(b => b.Terminal)
            .FirstOrDefaultAsync();

        if (binding?.Terminal == null || !binding.Terminal.IsActive)
            return null;

        return new DeviceContextDto
        {
            TerminalUid     = binding.Terminal.TerminalUid,
            TerminalCode    = binding.Terminal.TerminalCode,
            Location        = binding.Terminal.Location,
            OrganizationId  = binding.OrganizationId
        };
    }

    public async Task<bool> ReleaseDeviceContextAsync(Guid deviceToken)
    {
        var binding = await _context.TerminalDeviceBindings
            .Where(b => b.DeviceToken == deviceToken && b.IsActive)
            .FirstOrDefaultAsync();

        if (binding == null) return false;

        binding.IsActive = false;
        binding.UnboundAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "[ReleaseDeviceContext] Device binding released anonymously. DeviceToken={DeviceToken}, TerminalId={TerminalId}",
            deviceToken, binding.TerminalId);

        return true;
    }

    private void EnforceBindCooldown(Guid userId, Guid organizationId)
    {
        var cooldownSeconds = _configuration.GetValue<int>("Terminal:BindCooldownSeconds", 30);
        if (cooldownSeconds <= 0)
        {
            return;
        }

        var cooldownKey = BuildCooldownKey(userId, organizationId);
        if (_cache.TryGetValue<DateTime>(cooldownKey, out var cooldownUntil)
            && cooldownUntil > DateTime.UtcNow)
        {
            var secondsRemaining = Math.Max(1, (int)Math.Ceiling((cooldownUntil - DateTime.UtcNow).TotalSeconds));
            throw new InvalidOperationException(
                $"Please wait {secondsRemaining} seconds before binding another terminal.");
        }
    }

    private void EnforceBindRateLimit(Guid userId, Guid organizationId)
    {
        var maxAttempts = _configuration.GetValue<int>("Terminal:BindRateLimitCount", 5);
        var windowSeconds = _configuration.GetValue<int>("Terminal:BindRateLimitWindowSeconds", 300);

        if (maxAttempts <= 0)
        {
            return;
        }

        if (windowSeconds < 30)
        {
            windowSeconds = 30;
        }

        var rateLimitKey = BuildRateLimitKey(userId, organizationId);
        var window = TimeSpan.FromSeconds(windowSeconds);
        var now = DateTime.UtcNow;

        var counter = _cache.GetOrCreate(rateLimitKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = window;
            return new BindRateCounter
            {
                Count = 0,
                WindowStartedAt = now
            };
        });

        if (counter == null)
        {
            return;
        }

        counter.Count += 1;
        _cache.Set(rateLimitKey, counter, window);

        if (counter.Count > maxAttempts)
        {
            throw new InvalidOperationException(
                "Too many terminal binding attempts. Please wait a few minutes and try again.");
        }
    }

    private void SetBindCooldown(Guid userId, Guid organizationId)
    {
        var cooldownSeconds = _configuration.GetValue<int>("Terminal:BindCooldownSeconds", 30);
        if (cooldownSeconds <= 0)
        {
            return;
        }

        var cooldownUntil = DateTime.UtcNow.AddSeconds(cooldownSeconds);
        _cache.Set(
            BuildCooldownKey(userId, organizationId),
            cooldownUntil,
            TimeSpan.FromSeconds(cooldownSeconds));
    }

    private static string BuildCooldownKey(Guid userId, Guid organizationId)
        => $"terminal-bind-cooldown:{organizationId}:{userId}";

    private static string BuildRateLimitKey(Guid userId, Guid organizationId)
        => $"terminal-bind-rate-limit:{organizationId}:{userId}";

    private sealed class BindRateCounter
    {
        public int Count { get; set; }
        public DateTime WindowStartedAt { get; set; }
    }
}
