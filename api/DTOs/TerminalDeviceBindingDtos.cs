namespace PreOrderApp.DTOs;

/// <summary>
/// Response DTO for terminal device binding information
/// </summary>
public class TerminalDeviceBindingDto
{
    public long TerminalDeviceBindingId { get; set; }
    public Guid OrganizationId { get; set; }
    public long TerminalId { get; set; }
    public string TerminalCode { get; set; } = string.Empty;
    public Guid? DeviceToken { get; set; }
    public Guid? BoundByUserId { get; set; }
    public Guid? SessionId { get; set; }
    public DateTime? BoundAt { get; set; }
    public DateTime LastSeenAt { get; set; }
    public DateTime? UnboundAt { get; set; }
    public Guid? UnboundByUserId { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// Request to bind a device to a terminal
/// </summary>
public class BindDeviceRequest
{
    /// <summary>
    /// Terminal UID (GUID) to bind to - more secure than terminal code
    /// </summary>
    public Guid TerminalUid { get; set; }
    
    /// <summary>
    /// Device token from cookie (if exists) or null for new binding
    /// </summary>
    public string? DeviceToken { get; set; }
}

/// <summary>
/// Response after binding device with new/existing device token
/// </summary>
public class BindDeviceResponse
{
    public Guid DeviceToken { get; set; }
    public long TerminalId { get; set; }
    public string TerminalCode { get; set; } = string.Empty;
    public bool IsNewBinding { get; set; }
    public bool TakeoverOccurred { get; set; }
    public Guid? PreviousDeviceToken { get; set; }
}

/// <summary>
/// Request to unbind a device from a terminal
/// </summary>
public class UnbindDeviceRequest
{
    /// <summary>
    /// Terminal UID (GUID) to unbind from
    /// </summary>
    public Guid TerminalUid { get; set; }
}

/// <summary>
/// Request to check current device binding status
/// </summary>
public class CheckBindingRequest
{
    public Guid TerminalUid { get; set; }
}

/// <summary>
/// Response with current binding status
/// </summary>
public class CheckBindingResponse
{
    public bool IsBound { get; set; }
    public Guid? DeviceToken { get; set; }
    public long? TerminalId { get; set; }
    public string? TerminalCode { get; set; }
    public DateTime? BoundAt { get; set; }
    public DateTime? LastSeenAt { get; set; }
}
