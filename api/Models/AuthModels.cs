using PreOrderApp.Models;
public class RegistrationCode
{
    public Guid CodeId { get; set; }
    public Guid OrganizationId { get; set; }
    public string Code { get; set; } = string.Empty;
    public Guid CreatedByUserId { get; set; }
    public string? Email { get; set; }
    public string UserRole { get; set; } = "User";
    public DateTime ExpiresOn { get; set; }
    public bool IsUsed { get; set; }
    public Guid? UsedByUserId { get; set; }
    public DateTime? UsedOn { get; set; }
    public DateTime CreatedOn { get; set; }

    // Navigation properties
    public Organization Organization { get; set; } = null!;
    public SystemUser CreatedByUser { get; set; } = null!;
    public SystemUser? UsedByUser { get; set; }
}

namespace PreOrderApp.Models
{

public static class UserRoles
{
    public const string SystemAdmin = "SystemAdmin";
    public const string CompanyAdmin = "CompanyAdmin";
    //public const string admin = "admin";
    public const string User = "staff";
    public const string Customer = "customer";
    public const string Delivery = "delivery";
}

public class SystemUser
{
    public Guid UserId { get; set; }
    public string EmailAddress { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public Guid OrganizationId { get; set; }
    public string UserRole { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime? LastLoginOn { get; set; }
    
    // PIN Authentication properties
    public string? PinHash { get; set; }
    public int PinAttempts { get; set; }
    public DateTime? PinLockedUntil { get; set; }
    public DateTime? PinSetOn { get; set; }

    // Password reset (stored directly on the user – not in sessions)
    public string? PasswordResetCodeHash { get; set; }
    public DateTime? PasswordResetCodeExpiresOn { get; set; }

    // Navigation properties
    public Organization? Organization { get; set; }
}

public class RegisterUserRequest
{
    public string CompanyRegistrationCode { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
}

public class RegisterCompanyRequest
{
    public string CompanyName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string AddressLine1 { get; set; } = string.Empty;
    public string? AddressLine2 { get; set; }
    public string? AddressLine3 { get; set; }
    public string Locality { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty;
    public LicenseTier LicenseTier { get; set; }
    
    // Initial company admin info
    public string AdminEmail { get; set; } = string.Empty;
    public string AdminUserName { get; set; } = string.Empty;
    public string AdminPassword { get; set; } = string.Empty;
    public string AdminFirstName { get; set; } = string.Empty;
    public string AdminLastName { get; set; } = string.Empty;
}

public class CompanyRegistrationResponse
{
    public Guid OrganizationId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string RegistrationToken { get; set; } = string.Empty;
    public LicenseTier LicenseTier { get; set; }
    public AuthResponse AdminAuth { get; set; } = null!;
}

public class LoginRequest
{
    public string UserName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public Guid? TerminalId { get; set; } // Optional: Terminal ID for organization binding validation
}

public class PinLoginRequest
{
    public string UserId { get; set; } = string.Empty;
    public string Pin { get; set; } = string.Empty;
    public Guid? TerminalId { get; set; } // Optional: Terminal ID for organization binding validation
}

public class AuthResponse
{
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public Guid OrganizationId { get; set; }
    public string OrganizationName { get; set; } = string.Empty;
    public LicenseTier LicenseTier { get; set; }
    public string RegistrationToken { get; set; } = string.Empty;
    public string AccessToken { get; set; } = string.Empty;
    public string? RefreshToken { get; set; } = string.Empty; // Nullable - may be in HttpOnly cookie instead
    public Guid? TerminalId { get; set; }
    public string? TerminalCode { get; set; }
    public string? Location { get; set; }
}

public class RevokeTokenRequest
{
    public string RefreshToken { get; set; } = string.Empty;
}

public class RefreshTokenRequest
{
    public string RefreshToken { get; set; } = string.Empty;
}

public class GetPinUsersRequest
{
    public string? OrganizationId { get; set; }
}

public class UpdateMyProfileRequest
{
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string CurrentPassword { get; set; } = string.Empty;
    public string? NewPassword { get; set; }
    public string? ReenterNewPassword { get; set; }
}

public class UpdateOrganizationProfileRequest
{
    public string OrganizationName { get; set; } = string.Empty;
    public string PrimaryEmail { get; set; } = string.Empty;
    public string CurrentPassword { get; set; } = string.Empty;
    public string? ContactPhone { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? AddressLine3 { get; set; }
    public string? Locality { get; set; }
    public string? Region { get; set; }
    public string? PostalCode { get; set; }
    public string? CountryCode { get; set; }
}

public class ForgotPasswordCodeRequest
{
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordWithCodeRequest
{
    public string Email { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class UserSession
{
    public Guid SessionId { get; set; }
    public Guid UserId { get; set; }
    public string SessionToken { get; set; } = string.Empty; // Refresh token
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime CreatedOn { get; set; }
    public DateTime LastAccessedOn { get; set; }
    public DateTime ExpiresOn { get; set; }
    public bool IsActive { get; set; }

    // Navigation
    public SystemUser User { get; set; } = null!;
}
}