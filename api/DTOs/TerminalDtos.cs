namespace PreOrderApp.DTOs;

/// <summary>
/// Response DTO for terminal data (external API representation)
/// Uses TerminalUid (UUID) as the external identifier
/// </summary>
public class TerminalDto
{
    public Guid TerminalUid { get; set; }
    public string TerminalCode { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Anonymous device context response — returned from device_token cookie alone, no auth required.
/// Used to rehydrate TerminalContextService on hard reload.
/// </summary>
public class DeviceContextDto
{
    public Guid TerminalUid { get; set; }
    public string TerminalCode { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public Guid OrganizationId { get; set; }
}

/// <summary>
/// Request DTO for creating a new terminal
/// </summary>
public class CreateTerminalRequest
{
    public string TerminalCode { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
}

/// <summary>
/// Request DTO for updating an existing terminal
/// All fields optional for partial updates
/// </summary>
public class UpdateTerminalRequest
{
    public string? TerminalCode { get; set; }
    public string? Location { get; set; }
    public bool? IsActive { get; set; }
}
