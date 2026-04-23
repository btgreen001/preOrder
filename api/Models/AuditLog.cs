using System;
using System.ComponentModel.DataAnnotations;

namespace PreOrderApp.Models
{
    public class AuditLog
    {
        [Key]
        public long LogId { get; set; }
        
        public Guid? UserId { get; set; }
        
        public Guid? OrganizationId { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Action { get; set; } = string.Empty;
        
        [MaxLength(50)]
        public string? EntityType { get; set; }
        
        [MaxLength(255)]
        public string? EntityId { get; set; }
        
        public string? Details { get; set; }
        
        [MaxLength(45)]
        public string? IpAddress { get; set; }
        
        [MaxLength(500)]
        public string? UserAgent { get; set; }
        
        public DateTime Timestamp { get; set; }
        
        public SystemUser? User { get; set; }
        public Organization? Organization { get; set; }
    }
    
    public static class AuditActions
    {
        public const string Login = "Login";
        public const string LoginFailed = "LoginFailed";
        public const string Logout = "Logout";
        public const string TokenRefresh = "TokenRefresh";
        public const string TokenRefreshFailed = "TokenRefreshFailed";
        public const string TokenRevoked = "TokenRevoked";
        public const string UserRegistration = "UserRegistration";
        public const string CompanyRegistration = "CompanyRegistration";
        public const string PasswordChange = "PasswordChange";
        public const string UnauthorizedAccess = "UnauthorizedAccess";
        public const string RateLimitExceeded = "RateLimitExceeded";
        
        // PIN Authentication Actions
        public const string PinSetup = "PinSetup";
        public const string PinValidated = "PinValidated";
        public const string PinValidationFailed = "PinValidationFailed";
        public const string PinChanged = "PinChanged";
        public const string PinReset = "PinReset";
    }
}
