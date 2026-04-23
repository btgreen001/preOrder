namespace PreOrderApp.Models;

/// <summary>
/// Represents a physical terminal in an organization (e.g., kitchen, counter, office)
/// Used for terminal-based access control and session management
/// </summary>
public class Terminal
{
    public long TerminalId { get; set; }
    public Guid OrganizationId { get; set; }
    
    /// <summary>
    /// Unique code per organization: "kitchen-1", "counter-2", etc.
    /// Used for identifying terminal in logs and admin panel
    /// </summary>
    public string TerminalCode { get; set; } = string.Empty;
    
    /// <summary>
    /// Human-readable location: "Main Kitchen", "Front Counter", "Office"
    /// </summary>
    public string Location { get; set; } = string.Empty;
    
    public bool IsActive { get; set; } = true;
    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int VersionNbr { get; set; } = 1;
    public Guid TerminalUid { get; set; } = Guid.NewGuid();
    
    // Navigation
    public virtual Organization? Organization { get; set; }
    public virtual ICollection<TerminalSessionLock> SessionLocks { get; set; } = new List<TerminalSessionLock>();
    public virtual ICollection<TerminalDeviceBinding> DeviceBindings { get; set; } = new List<TerminalDeviceBinding>();
}

/// <summary>
/// Represents browser device binding to a terminal for crash recovery and licensing
/// Enables terminals to remember which device they were last accessed from
/// Supports: browser crash recovery, device sticky binding, future license enforcement
/// </summary>
public class TerminalDeviceBinding
{
    public long TerminalDeviceBindingId { get; set; }
    public Guid OrganizationId { get; set; }
    public long TerminalId { get; set; }
    
    /// <summary>
    /// Unique device token (UUID) stored in HttpOnly cookie
    /// Links browser device to terminal
    /// </summary>
    public Guid? DeviceToken { get; set; }
    
    /// <summary>
    /// PIN user who bound this device to the terminal
    /// Null if unbound by admin
    /// </summary>
    public Guid? BoundByUserId { get; set; }
    
    private DateTime _boundAt = DateTime.UtcNow;
    public DateTime? BoundAt
    {
        get => _boundAt;
        set => _boundAt = value.HasValue && value.Value.Kind == DateTimeKind.Utc ? value.Value : (value.HasValue ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc) : DateTime.UtcNow);
    }
    
    /// <summary>
    /// When the device was last seen accessing this terminal
    /// Used for staleness detection
    /// </summary>
    private DateTime _lastSeenAt = DateTime.UtcNow;
    public DateTime LastSeenAt
    {
        get => _lastSeenAt;
        set => _lastSeenAt = value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);
    }
    
    /// <summary>
    /// When the device was unbound from the terminal (null if still bound)
    /// </summary>
    private DateTime? _unboundAt;
    public DateTime? UnboundAt
    {
        get => _unboundAt;
        set => _unboundAt = value == null ? null : (value.Value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value.Value, DateTimeKind.Utc));
    }
    
    /// <summary>
    /// User who unbound the device (null if still bound)
    /// </summary>
    public Guid? UnboundByUserId { get; set; }

    /// <summary>
    /// The UserSession.SessionId active when this binding was created.
    /// Used to terminate zombie sessions when a terminal is taken over or unbound.
    /// </summary>
    public Guid? SessionId { get; set; }

    /// <summary>
    /// True if this binding is currently active
    /// False if device was unbound or taken over
    /// </summary>
    public bool IsActive { get; set; } = true;
    
    private DateTime _createdAt = DateTime.UtcNow;
    public DateTime CreatedAt
    {
        get => _createdAt;
        set => _createdAt = value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);
    }
    
    private DateTime _updatedAt = DateTime.UtcNow;
    public DateTime UpdatedAt
    {
        get => _updatedAt;
        set => _updatedAt = value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);
    }
    
    // Navigation
    public virtual Organization? Organization { get; set; }
    public virtual Terminal? Terminal { get; set; }
}

/// <summary>
/// Tracks terminal lock sessions for security lockouts
/// - Supports auto-lock after inactivity
/// - Supports manual lock by supervisor
/// - Keeps historical record of all locks/unlocks
/// </summary>
public class TerminalSessionLock
{
    public long TerminalSessionLockId { get; set; }
    public Guid OrganizationId { get; set; }
    public long TerminalId { get; set; }
    
    /// <summary>
    /// When the terminal was locked
    /// </summary>
    private DateTime? _lockedAt = DateTime.UtcNow;
    public DateTime? LockedAt
    {
        get => _lockedAt;
        set => _lockedAt = value == null ? null : (value.Value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value.Value, DateTimeKind.Utc));
    }
    
    /// <summary>
    /// User who locked the terminal (NULL for auto-lock)
    /// </summary>
    public Guid? LockedByUserId { get; set; }
    
    /// <summary>
    /// Status code for the lock (e.g., "LOCKED", "ACTIVE", "INACTIVE")
    /// </summary>
    public string? StatusCd { get; set; }
    
    /// <summary>
    /// When the terminal was last accessed (used for idle timeout detection)
    /// Updated on every API call to this terminal
    /// </summary>
    private DateTime? _lastActivityOn = DateTime.UtcNow;
    public DateTime? LastActivityOn
    {
        get => _lastActivityOn;
        set => _lastActivityOn = value == null ? null : (value.Value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value.Value, DateTimeKind.Utc));
    }
    
    private DateTime _createdAt = DateTime.UtcNow;
    public DateTime CreatedAt
    {
        get => _createdAt;
        set => _createdAt = value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);
    }
    
    private DateTime? _sessionBeginOn = DateTime.UtcNow;
    public DateTime? SessionBeginOn
    {
        get => _sessionBeginOn;
        set => _sessionBeginOn = value == null ? null : (value.Value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value.Value, DateTimeKind.Utc));
    }

    private DateTime? _sessionEndOn = DateTime.UtcNow;
    public DateTime? SessionEndOn
    {
        get => _sessionEndOn;
        set => _sessionEndOn = value == null ? null : (value.Value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value.Value, DateTimeKind.Utc));
    }
    // Navigation
    public virtual Organization? Organization { get; set; }
    public virtual Terminal? Terminal { get; set; }
    
    /// <summary>
    /// Check if this lock is currently active (records are deleted when unlocked)
    /// </summary>
    public bool IsActive => true; // By definition, only active locks exist in the database
    
    /// <summary>
    /// Get duration the terminal has been locked (from LockedAt to now)
    /// </summary>
    public TimeSpan LockedDuration
    {
        get
        {
            if (LockedAt == null)
                return TimeSpan.Zero;
            return DateTime.UtcNow - LockedAt.Value;
        }
    }
}

/// <summary>
/// Organization-specific settings stored as key-value pairs
/// Examples: inactivity_threshold_minutes, session_timeout, feature_flags
/// </summary>
public class OrganizationSetting
{
    public long OrganizationSettingId { get; set; }
    public Guid OrganizationId { get; set; }
    
    /// <summary>
    /// Setting name: "inactivity_threshold_minutes", "session_timeout", etc.
    /// </summary>
    public string SettingKey { get; set; } = string.Empty;
    
    /// <summary>
    /// Setting value as string (application code parses as needed)
    /// </summary>
    public string? SettingValue { get; set; }
    
    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int VersionNbr { get; set; } = 1;
    
    // Navigation
    public virtual Organization? Organization { get; set; }
    
    /// <summary>
    /// Parse setting value as integer (useful for threshold settings)
    /// </summary>
    public int AsInt() => int.TryParse(SettingValue, out var result) ? result : 0;
    
    /// <summary>
    /// Parse setting value as boolean
    /// </summary>
    public bool AsBool() => SettingValue?.ToLower() == "true" || SettingValue == "1";
}
