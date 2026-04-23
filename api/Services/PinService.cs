using Microsoft.EntityFrameworkCore;
using PreOrderApp.Data;
using PreOrderApp.Models;
using System.Text.RegularExpressions;

namespace PreOrderApp.Services;

public class PinService : IPinService
{
    private readonly AppDbContext _context;
    private readonly IPasetoTokenService _tokenService;
    private readonly IAuditService _auditService;
    private const int MaxPinAttempts = 5;
    private const int LockoutMinutes = 15;
    private const int MinPinLength = 4;
    private const int MaxPinLength = 6;

    public PinService(
        AppDbContext context,
        IPasetoTokenService tokenService,
        IAuditService auditService)
    {
        _context = context;
        _tokenService = tokenService;
        _auditService = auditService;
    }

    public async Task<PinSetupResult> SetupPinAsync(Guid userId, string pin)
    {
        // Validate PIN format
        var validationError = ValidatePinFormat(pin);
        if (validationError != null)
        {
            return new PinSetupResult { Success = false, Message = validationError };
        }

        var user = await _context.SystemUsers.FindAsync(userId);
        if (user == null)
        {
            return new PinSetupResult { Success = false, Message = "User not found" };
        }

        // Hash the PIN with BCrypt
        user.PinHash = BCrypt.Net.BCrypt.HashPassword(pin);
        user.PinSetOn = DateTime.UtcNow;
        user.PinAttempts = 0;
        user.PinLockedUntil = null;

        await _context.SaveChangesAsync();

        await _auditService.LogEventAsync(
            AuditActions.PinSetup,
            userId,
            user.OrganizationId,
            "SystemUser",
            userId.ToString(),
            null,
            null,
            "PIN set up successfully"
        );

        return new PinSetupResult { Success = true, Message = "PIN set up successfully" };
    }

    public async Task<PinValidationResult> ValidatePinAsync(string username, string pin)
    {
        var user = await _context.SystemUsers
            .AsNoTracking()
            .Include(u => u.Organization)
            .FirstOrDefaultAsync(u => u.UserName == username);

        if (user == null)
        {
            return new PinValidationResult
            {
                Success = false,
                Message = "User not found"
            };
        }

        // Check if user has a PIN set up
        if (string.IsNullOrEmpty(user.PinHash))
        {
            return new PinValidationResult
            {
                Success = false,
                Message = "PIN not set up for this user"
            };
        }

        // Check if locked out
        if (user.PinLockedUntil.HasValue && user.PinLockedUntil.Value > DateTime.UtcNow)
        {
            await _auditService.LogEventAsync(
                AuditActions.PinValidationFailed,
                user.UserId,
                user.OrganizationId,
                "SystemUser",
                user.UserId.ToString(),
                null,
                null,
                $"PIN validation blocked - account locked until {user.PinLockedUntil.Value:HH:mm:ss}"
            );

            return new PinValidationResult
            {
                Success = false,
                LockedUntil = user.PinLockedUntil,
                Message = $"Account locked until {user.PinLockedUntil.Value:HH:mm:ss}"
            };
        }

        // Validate PIN
        bool isValid = BCrypt.Net.BCrypt.Verify(pin, user.PinHash);

        if (isValid)
        {
            // Reset attempt counter and lockout
            user.PinAttempts = 0;
            user.PinLockedUntil = null;
            user.LastLoginOn = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Generate access token
            var accessToken = _tokenService.GenerateAccessToken(user);

            // Get license tier
            var subscription = await _context.LicenseSubscriptions
                .AsNoTracking()
                .Where(ls => ls.OrganizationId == user.OrganizationId && ls.IsActive)
                .OrderByDescending(ls => ls.StartDate)
                .FirstOrDefaultAsync();

            var authResponse = new AuthResponse
            {
                UserId = user.UserId,
                UserName = user.UserName,
                Email = user.EmailAddress,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Role = user.UserRole,
                OrganizationId = user.OrganizationId,
                OrganizationName = user.Organization?.OrganizationName ?? "",
                LicenseTier = subscription?.Tier ?? LicenseTier.Basic,
                RegistrationToken = user.Organization?.RegistrationToken ?? string.Empty,
                AccessToken = accessToken
            };

            await _auditService.LogEventAsync(
                AuditActions.PinValidated,
                user.UserId,
                user.OrganizationId,
                "SystemUser",
                user.UserId.ToString(),
                null,
                null,
                $"PIN validation successful for {username}"
            );

            return new PinValidationResult
            {
                Success = true,
                AccessToken = accessToken,
                User = authResponse,
                Message = "PIN validation successful"
            };
        }
        else
        {
            // Increment failure counter
            user.PinAttempts++;

            // Lock if too many attempts
            if (user.PinAttempts >= MaxPinAttempts)
            {
                user.PinLockedUntil = DateTime.UtcNow.AddMinutes(LockoutMinutes);
                await _context.SaveChangesAsync();

                await _auditService.LogEventAsync(
                    AuditActions.PinValidationFailed,
                    user.UserId,
                    user.OrganizationId,
                    "SystemUser",
                    user.UserId.ToString(),
                    null,
                    null,
                    $"Too many failed PIN attempts ({user.PinAttempts}) for {username} - account locked for {LockoutMinutes} minutes"
                );

                return new PinValidationResult
                {
                    Success = false,
                    AttemptsRemaining = 0,
                    LockedUntil = user.PinLockedUntil,
                    Message = $"Too many failed attempts. Account locked for {LockoutMinutes} minutes."
                };
            }

            await _context.SaveChangesAsync();

            await _auditService.LogEventAsync(
                AuditActions.PinValidationFailed,
                user.UserId,
                user.OrganizationId,
                "SystemUser",
                user.UserId.ToString(),
                null,
                null,
                $"Invalid PIN attempt for {username} - {user.PinAttempts} total attempts"
            );

            return new PinValidationResult
            {
                Success = false,
                AttemptsRemaining = MaxPinAttempts - user.PinAttempts,
                Message = $"Invalid PIN. {MaxPinAttempts - user.PinAttempts} attempts remaining."
            };
        }
    }

    public async Task<PinChangeResult> ChangePinAsync(Guid userId, string currentPin, string newPin)
    {
        var user = await _context.SystemUsers.FindAsync(userId);
        if (user == null)
        {
            return new PinChangeResult { Success = false, Message = "User not found" };
        }

        // Verify current PIN
        if (string.IsNullOrEmpty(user.PinHash) || !BCrypt.Net.BCrypt.Verify(currentPin, user.PinHash))
        {
            return new PinChangeResult { Success = false, Message = "Current PIN is incorrect" };
        }

        // Validate new PIN format
        var validationError = ValidatePinFormat(newPin);
        if (validationError != null)
        {
            return new PinChangeResult { Success = false, Message = validationError };
        }

        // Update PIN
        user.PinHash = BCrypt.Net.BCrypt.HashPassword(newPin);
        user.PinSetOn = DateTime.UtcNow;
        user.PinAttempts = 0;
        user.PinLockedUntil = null;

        await _context.SaveChangesAsync();

        await _auditService.LogEventAsync(
            AuditActions.PinChanged,
            userId,
            user.OrganizationId,
            "SystemUser",
            userId.ToString(),
            null,
            null,
            "PIN changed successfully"
        );

        return new PinChangeResult { Success = true, Message = "PIN changed successfully" };
    }

    public async Task<PinResetResult> ResetPinAsync(string username)
    {
        var user = await _context.SystemUsers
            .FirstOrDefaultAsync(u => u.UserName == username);

        if (user == null)
        {
            return new PinResetResult { Success = false, Message = "User not found" };
        }

        // Clear PIN and reset attempts
        user.PinHash = null;
        user.PinSetOn = null;
        user.PinAttempts = 0;
        user.PinLockedUntil = null;

        await _context.SaveChangesAsync();

        await _auditService.LogEventAsync(
            AuditActions.PinReset,
            user.UserId,
            user.OrganizationId,
            "SystemUser",
            user.UserId.ToString(),
            null,
            null,
            $"PIN reset by administrator for {username}"
        );

        return new PinResetResult { Success = true, Message = "PIN reset successfully" };
    }

    public async Task<PinStatusResult> GetPinStatusAsync(Guid userId)
    {
        var user = await _context.SystemUsers.FindAsync(userId);
        if (user == null)
        {
            return new PinStatusResult { HasPin = false };
        }

        return new PinStatusResult
        {
            HasPin = !string.IsNullOrEmpty(user.PinHash),
            PinSetOn = user.PinSetOn
        };
    }

    private string? ValidatePinFormat(string pin)
    {
        if (string.IsNullOrWhiteSpace(pin))
        {
            return "PIN cannot be empty";
        }

        if (pin.Length < MinPinLength || pin.Length > MaxPinLength)
        {
            return $"PIN must be between {MinPinLength} and {MaxPinLength} digits";
        }

        if (!Regex.IsMatch(pin, @"^\d+$"))
        {
            return "PIN must contain only digits";
        }

        // Block common patterns
        string[] blockedPatterns = { "0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999", "1234", "4321", "0123", "9876" };
        if (blockedPatterns.Contains(pin))
        {
            return "PIN cannot be a common pattern (1234, 1111, etc.)";
        }

        return null;
    }
}
