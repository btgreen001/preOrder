using System;

namespace PreOrderApp.Models;

public class AdminAuditLog
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public string? PerformedBy { get; set; }
    public DateTime LoggedAt { get; set; }
}
