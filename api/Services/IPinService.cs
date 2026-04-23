using PreOrderApp.Models;

namespace PreOrderApp.Services;

public interface IPinService
{
    Task<PinSetupResult> SetupPinAsync(Guid userId, string pin);
    Task<PinValidationResult> ValidatePinAsync(string username, string pin);
    Task<PinChangeResult> ChangePinAsync(Guid userId, string currentPin, string newPin);
    Task<PinResetResult> ResetPinAsync(string username);
    Task<PinStatusResult> GetPinStatusAsync(Guid userId);
}

public class PinSetupResult
{
    public bool Success { get; set; }
    public string? Message { get; set; }
}

public class PinValidationResult
{
    public bool Success { get; set; }
    public string? AccessToken { get; set; }
    public AuthResponse? User { get; set; }
    public int? AttemptsRemaining { get; set; }
    public DateTime? LockedUntil { get; set; }
    public string? Message { get; set; }
}

public class PinChangeResult
{
    public bool Success { get; set; }
    public string? Message { get; set; }
}

public class PinResetResult
{
    public bool Success { get; set; }
    public string? Message { get; set; }
}

public class PinStatusResult
{
    public bool HasPin { get; set; }
    public DateTime? PinSetOn { get; set; }
}
