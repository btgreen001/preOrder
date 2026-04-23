namespace OrderMgmt.DTOs;

public class PinUserDto
{
    public Guid UserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool HasPinEnabled { get; set; }
    public bool IsLocked { get; set; }
    public int PinAttempts { get; set; }
    public DateTime? PinSetOn { get; set; }
}

public class CreatePinUserRequest
{
    public Guid UserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

public class UpdatePinUserRequest
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? EmailAddress { get; set; }
}

public class AdminAuditLogDto
{
    public Guid AuditLogId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public string PerformedBy { get; set; } = string.Empty;
    public DateTime LoggedAt { get; set; }
}

public class PinAdminSummaryDto
{
    public int TotalPinUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int LockedUsers { get; set; }
    public int RecentFailedAttempts { get; set; }
    public List<AdminAuditLogDto> RecentActions { get; set; } = new();
}
