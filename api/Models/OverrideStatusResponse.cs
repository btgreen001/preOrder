// Models/OverrideStatusResponse.cs
public class OverrideStatusResponse
{
    public string ExternalId { get; set; } = null!;
    public string OldStatus { get; set; } = null!;
    public string NewStatus { get; set; } = null!;
    public DateTimeOffset UpdatedAt { get; set; }
    public string UpdatedBy { get; set; } = null!;
}
