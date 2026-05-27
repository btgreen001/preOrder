using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using PreOrderApp.Models;
using PreOrderApp.Data;
using PreOrderApp.Infrastructure;
using BCrypt.Net;

namespace PreOrderApp.Services;

public interface IAuthService
{
    Task<AuthResponse?> LoginAsync(LoginRequest request, Guid? terminalId = null);
    Task<AuthResponse> RegisterUserAsync(RegisterUserRequest request);
    Task<CompanyRegistrationResponse> RegisterCompanyAsync(RegisterCompanyRequest request);
    Task<bool> IsUserNameAvailableAsync(string userName);
    Task<bool> RevokeRefreshTokenAsync(string refreshToken);
    Task<bool> RevokeAllUserTokensAsync(Guid userId, bool releaseBindings = false);
    Task<(AuthResponse? response, bool isIdleTimeout)> RefreshTokenAsync(string refreshToken, Guid? organizationId = null, long? terminalId = null);
    Task<AuthResponse?> PinLoginAsync(PinLoginRequest request, Guid? terminalId = null);
    /// <summary>
    /// Centralized logout: revoke all tokens for a user, a specific refresh token, or both. Optionally logs the event.
    /// </summary>
    Task<bool> LogoutAsync(string? refreshToken = null, string? reason = null);

    /// <summary>
    /// Logout all sessions for a user.
    /// </summary>
    Task<bool> LogoutAllAsync(Guid? userId = null, string? refreshToken = null, string? reason = null);
    Task RequestPasswordResetCodeAsync(string email);
    Task RequestUsernameReminderAsync(string email);
    Task ResetPasswordWithCodeAsync(string email, string code, string newPassword);
}

public class AuthService : IAuthService
{
    internal readonly IConfiguration _configuration;
    private readonly AppDbContext _context;
    private readonly IPasetoTokenService _tokenService;
    private readonly ITerminalLockService _terminalLockService;
    private readonly IEmailService _emailService;
    private readonly ILogger<AuthService> _logger;
    private readonly IOrganizationContextService _organizationContextService;

    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuthService(IConfiguration configuration, AppDbContext context, IPasetoTokenService tokenService, ITerminalLockService terminalLockService, IEmailService emailService, ILogger<AuthService> logger, IHttpContextAccessor httpContextAccessor, IOrganizationContextService organizationContextService)
    {
        _configuration = configuration;
        _context = context;
        _tokenService = tokenService;
        _terminalLockService = terminalLockService;
        _emailService = emailService;
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
        _organizationContextService = organizationContextService;
    }

    private static string GeneratePasswordResetCode()
    {
        return Random.Shared.Next(100000, 1000000).ToString();
    }

    private async Task<(int releasedBindings, int clearedLocks)> ReleaseBindingsAndClearLocksAsync(
        Guid? filterByUserId,
        IEnumerable<Guid>? sessionIds,
        Guid? unboundByUserId,
        string reason,
        bool includeAllUserBindings = false,
        bool releaseBindings = false)
    {
        var sessionIdList = (sessionIds ?? Enumerable.Empty<Guid>())
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();

        var canFilterByUser = includeAllUserBindings && filterByUserId.HasValue;

        if (!canFilterByUser && sessionIdList.Count == 0)
        {
            return (0, 0);
        }

        var userIdFilter = filterByUserId.GetValueOrDefault();

        var bindingsQuery = _context.TerminalDeviceBindings
            .Where(b => b.IsActive);

        if (canFilterByUser && sessionIdList.Count > 0)
        {
            bindingsQuery = bindingsQuery.Where(b =>
                b.BoundByUserId == userIdFilter ||
                (b.SessionId.HasValue && sessionIdList.Contains(b.SessionId.Value)));
        }
        else if (sessionIdList.Count > 0)
        {
            bindingsQuery = bindingsQuery.Where(b => b.SessionId.HasValue && sessionIdList.Contains(b.SessionId.Value));
        }
        else
        {
            bindingsQuery = bindingsQuery.Where(b => b.BoundByUserId == userIdFilter);
        }

        var bindings = await bindingsQuery.ToListAsync();
        if (bindings.Count == 0)
        {
            return (0, 0);
        }

        var now = DateTime.UtcNow;
        if (releaseBindings)
        {
            foreach (var binding in bindings)
            {
                binding.IsActive = false;
                binding.BoundAt = null;
                binding.BoundByUserId = null;
                binding.DeviceToken = null;
                binding.UnboundAt = now;
                if (unboundByUserId.HasValue)
                {
                    binding.UnboundByUserId = unboundByUserId;
                }
                binding.UpdatedAt = now;
            }
        }

        var terminalIds = bindings
            .Select(b => b.TerminalId)
            .Distinct()
            .ToList();

        var locks = await _context.TerminalSessionLocks
            .Where(l => terminalIds.Contains(l.TerminalId) && l.LockedAt != null)
            .ToListAsync();

        foreach (var terminalLock in locks)
        {
            terminalLock.LockedAt = null;
            terminalLock.LockedByUserId = null;
            terminalLock.StatusCd = "INAC";
            terminalLock.SessionBeginOn = null;
            terminalLock.SessionEndOn = now;
            terminalLock.LastActivityOn = now;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "[AuthService] Logout cleanup complete. Reason: {Reason}. Released bindings: {ReleasedBindings}. Cleared locks: {ClearedLocks}. ReleaseBindingsEnabled: {ReleaseBindingsEnabled}",
            reason,
            releaseBindings ? bindings.Count : 0,
            locks.Count,
            releaseBindings);

        return (releaseBindings ? bindings.Count : 0, locks.Count);
    }

    /// <summary>
    /// Logout this session only. Reads jti (SessionId) and sub (UserId) directly from the current Bearer token.
    /// </summary>
    public async Task<bool> LogoutAsync(string? refreshToken = null, string? reason = null)
    {
        var user = _httpContextAccessor.HttpContext?.User;

        // Extract session ID from jti claim — pinpoints the exact UserSession row
        Guid? sessionId = null;
        var jtiClaim = user?.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti)?.Value
                    ?? user?.FindFirst("jti")?.Value;
        if (!string.IsNullOrEmpty(jtiClaim) && Guid.TryParse(jtiClaim, out var parsedSessionId))
            sessionId = parsedSessionId;

        // Extract userId for fallback paths and logging
        Guid? userId = null;
        var subClaim = user?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(subClaim) && Guid.TryParse(subClaim, out var parsedUserId))
            userId = parsedUserId;

        bool any = false;

        if (sessionId.HasValue)
        {
            var session = await _context.UserSessions
                .FirstOrDefaultAsync(s => s.SessionId == sessionId.Value && s.IsActive);

            if (session != null)
            {
                session.IsActive = false;
                await _context.SaveChangesAsync();
                any = true;
            }

            _logger.LogInformation("[LogoutAsync] Revoked by jti. SessionId: {SessionId}. UserId: {UserId}. Reason: {Reason}",
                sessionId.Value, userId?.ToString() ?? "n/a", reason ?? "n/a");

            var cleanup = await ReleaseBindingsAndClearLocksAsync(
                filterByUserId: null,
                sessionIds: new[] { sessionId.Value },
                unboundByUserId: userId,
                reason: reason ?? "USER_LOGOUT",
                releaseBindings: true);

            any |= cleanup.releasedBindings > 0 || cleanup.clearedLocks > 0;
        }
        else if (!string.IsNullOrWhiteSpace(refreshToken))
        {
            any = await RevokeRefreshTokenAsync(refreshToken);
            _logger.LogInformation("[LogoutAsync] Revoked by refresh token cookie. UserId: {UserId}. Reason: {Reason}",
                userId?.ToString() ?? "n/a", reason ?? "n/a");
        }
        else if (userId.HasValue)
        {
            // Last resort: jti missing (old token) and no cookie — revoke most-recent session
            var session = await _context.UserSessions
                .Where(s => s.UserId == userId.Value && s.IsActive)
                .OrderByDescending(s => s.LastAccessedOn)
                .FirstOrDefaultAsync();

            if (session != null)
            {
                session.IsActive = false;
                await _context.SaveChangesAsync();
                any = true;

                var cleanup = await ReleaseBindingsAndClearLocksAsync(
                    filterByUserId: null,
                    sessionIds: new[] { session.SessionId },
                    unboundByUserId: userId,
                    reason: reason ?? "USER_LOGOUT",
                    releaseBindings: true);

                any |= cleanup.releasedBindings > 0 || cleanup.clearedLocks > 0;
            }

            _logger.LogInformation("[LogoutAsync] Revoked most-recent session (no jti/cookie). UserId: {UserId}. Reason: {Reason}",
                userId.Value, reason ?? "n/a");
        }
        else
        {
            _logger.LogWarning("[LogoutAsync] Nothing to revoke — no jti, refreshToken, or userId available.");
        }

        return any;
    }

    /// <summary>
    /// Logout all sessions: deactivates every active session for the user.
    /// </summary>
    public async Task<bool> LogoutAllAsync(Guid? userId = null, string? refreshToken = null, string? reason = null)
    {
        // Resolve userId from refresh token when not provided directly
        var resolvedUserId = userId;
        if (!resolvedUserId.HasValue && !string.IsNullOrWhiteSpace(refreshToken))
        {
            var sessionByToken = await _context.UserSessions
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SessionToken == refreshToken);

            resolvedUserId = sessionByToken?.UserId;
        }

        bool any = false;
        var shouldReleaseBindings = string.Equals(reason, "USER_LOGOUT", StringComparison.OrdinalIgnoreCase);

        if (resolvedUserId.HasValue)
        {
            any |= await RevokeAllUserTokensAsync(resolvedUserId.Value, shouldReleaseBindings);

            _logger.LogInformation("[LogoutAllAsync] UserId: {UserId}. Reason: {Reason}",
                resolvedUserId.Value, reason ?? "n/a");
        }
        else if (!string.IsNullOrWhiteSpace(refreshToken))
        {
            // Fallback: can't resolve user — revoke just this token
            any |= await RevokeRefreshTokenAsync(refreshToken);
        }

        return any;
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request, Guid? terminalId = null)
    {
        string sanitizedUser = StringSanitizer.SanitizeForLog(request?.UserName);
        if (request == null)
        {
            _logger.LogWarning("[LoginAsync] Request payload was null.");
            return null;
        }

        if (string.IsNullOrWhiteSpace(sanitizedUser) || string.IsNullOrWhiteSpace(request.Password))
        {
            _logger.LogWarning("[LoginAsync] Username or password missing.");
            return null;
        }
        string sanitizedPassedTerminalId = terminalId.HasValue ? StringSanitizer.SanitizeForLog(terminalId.Value.ToString()) : "null";
        string sanitizedRequestTerminalId = request.TerminalId != Guid.Empty ? StringSanitizer.SanitizeForLog(request.TerminalId.ToString()) : "null";

        _logger.LogInformation("[LoginAsync] Started. TerminalId from parameter: {TerminalId}, TerminalId from request: {RequestTerminalId}", sanitizedPassedTerminalId, sanitizedRequestTerminalId);

        if (!terminalId.HasValue || terminalId == Guid.Empty)
        {
            _logger.LogInformation("[LoginAsync] Using TerminalId from request: {TerminalId}", sanitizedRequestTerminalId);
        }
        var organizationId = Guid.Empty;
        try{
             _organizationContextService.TryGetCurrentOrganizationId(out organizationId);

        }
        catch{
            _logger.LogInformation("[LoginAsync] Unable to TryGetCurrentOrganizationId");
        }
        if (organizationId != Guid.Empty){
            _logger.LogInformation("[LoginAsync] Resolved organizationId from claims context: {organizationId}", organizationId);
        }

        var query = _context.SystemUsers
            .AsNoTracking()
            .Where(u => u.UserName == sanitizedUser);

        if (organizationId != Guid.Empty)
        {
            query = query.Where(u => u.OrganizationId == organizationId);
        }

        var user = await query
            .Select(u => new
            {
                u.UserId,
                u.UserName,
                u.EmailAddress,
                u.PasswordHash,
                u.FirstName,
                u.LastName,
                u.OrganizationId,
                u.UserRole
            })
            .FirstOrDefaultAsync();

        if (user == null || string.IsNullOrWhiteSpace(user.PasswordHash))
            return null;

        bool isPasswordValid;
        try
        {
            isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[LoginAsync] Password hash verification failed for user {UserName}", sanitizedUser);
            return null;
        }

        if (!isPasswordValid)
            return null;

        // Determine the effective terminal ID as a Guid
        Guid effectiveTerminalId = terminalId 
            ?? request.TerminalId 
            ?? Guid.Empty;


        // Log the string representation
        string safeTerminalId = effectiveTerminalId.ToString("D");
        _logger.LogInformation($"[LoginAsync] Effective terminalId: {safeTerminalId}");

        Terminal? loginTerminalContext = null;
        // Validate terminal organization match if terminalId provided
        if (effectiveTerminalId != Guid.Empty)
        {
            _logger.LogInformation($"[LoginAsync] Validating terminal: {effectiveTerminalId}");
            loginTerminalContext = await _context.Terminals
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TerminalUid == effectiveTerminalId && t.IsActive);

            _logger.LogInformation($"[LoginAsync] Terminal lookup result: {(loginTerminalContext == null ? "NULL" : $"Found - OrgId: {loginTerminalContext.OrganizationId}")}");
            // Check NULL first (invalid/non-existent terminal)
            if (loginTerminalContext == null)
            {
                // Terminal not found or inactive - REJECT login
                _logger.LogWarning($"[LoginAsync] Terminal not found or inactive: {effectiveTerminalId}");
                throw new UnauthorizedAccessException("Terminal access denied.  Please confirm your login for this terminal.  Please contact your administrator.");
            }
            
            // Check organization match (valid terminal, wrong org)
            if (loginTerminalContext.OrganizationId != user.OrganizationId)
            {
                // Terminal and user organization mismatch - REJECT login with generic message
                _logger.LogWarning($"[LoginAsync] Org mismatch. Terminal org: {loginTerminalContext.OrganizationId}, User org: {user.OrganizationId}");
                throw new UnauthorizedAccessException("Terminal access denied.  Please confirm your login for this terminal.  Please contact your administrator.");
            }
            
            _logger.LogInformation($"[LoginAsync] Terminal validation passed");
        }
        else
        {
            _logger.LogInformation($"[LoginAsync] No terminal ID provided - skipping validation");
        }
        // Update last login time
        await _context.SystemUsers
            .Where(u => u.UserId == user.UserId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(u => u.LastLoginOn, DateTime.UtcNow));

        var organization = await _context.Organizations
            .AsNoTracking()
            .Where(o => o.OrganizationId == user.OrganizationId)
            .Select(o => new
            {
                o.OrganizationName,
                o.RegistrationToken
            })
            .FirstOrDefaultAsync();

        if (organization == null)
            throw new InvalidOperationException("Organization not found");

        var subscription = await _context.LicenseSubscriptions
            .AsNoTracking()
            .Where(ls => ls.OrganizationId == user.OrganizationId && ls.IsActive)
            .OrderByDescending(ls => ls.StartDate)
            .Select(ls => new { ls.Tier })
            .FirstOrDefaultAsync();

        var licenseTier = subscription?.Tier ?? LicenseTier.Basic;

        // Pre-generate session ID so it can be embedded in the access token as jti
        var sessionId = Guid.NewGuid();

        // Generate tokens using PASETO, include terminalId and sessionId
        var tokenUser = new SystemUser
        {
            UserId = user.UserId,
            UserName = user.UserName,
            UserRole = user.UserRole,
            OrganizationId = user.OrganizationId
        };

        var accessToken = _tokenService.GenerateAccessToken(tokenUser, effectiveTerminalId, sessionId);
        var refreshToken = _tokenService.GenerateRefreshToken();

        // Store refresh token in DB
        var userSession = new UserSession
        {
            SessionId = sessionId,
            UserId = user.UserId,
            SessionToken = refreshToken,
            IpAddress = _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString(), 
            UserAgent = _httpContextAccessor.HttpContext?.Request.Headers["User-Agent"].ToString(),
            CreatedOn = DateTime.UtcNow,
            LastAccessedOn = DateTime.UtcNow,
            ExpiresOn = DateTime.UtcNow.AddDays(_configuration.GetValue<int>("Paseto:RefreshTokenExpirationDays", 30)),
            IsActive = true
        };
        _context.UserSessions.Add(userSession);
        await _context.SaveChangesAsync();

        // Activate terminal session if terminal is provided (unlocks if previously locked, marks as active)
        if (effectiveTerminalId != Guid.Empty)
        {
            var terminal = await _context.Terminals
                .FirstOrDefaultAsync(t => t.TerminalUid == effectiveTerminalId && t.IsActive);
            if (terminal != null)
            {
                await _terminalLockService.ActivateTerminalSessionAsync(user.OrganizationId, terminal.TerminalId);
            }
            
            // Refresh user session activity timestamp after terminal activation to reset idle timeout
            userSession.LastAccessedOn = DateTime.UtcNow;
            _context.UserSessions.Update(userSession);
            await _context.SaveChangesAsync();
        }

        return new AuthResponse
        {
            UserId = user.UserId,
            UserName = user.UserName,
            Email = user.EmailAddress,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.UserRole,
            OrganizationId = user.OrganizationId,
            OrganizationName = organization.OrganizationName,
            LicenseTier = licenseTier,
            RegistrationToken = organization.RegistrationToken,
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            TerminalId = loginTerminalContext?.TerminalUid,
            TerminalCode = loginTerminalContext?.TerminalCode,
            Location = loginTerminalContext?.Location
        };
    }

    public async Task<AuthResponse> RegisterUserAsync(RegisterUserRequest request)
    {
        string sanitizedUserName = StringSanitizer.SanitizeForLog(request.UserName);
        string sanitizedEmail = StringSanitizer.SanitizeForUse(request.Email);
        string sanitizedCompanyRegistrationCode = StringSanitizer.SanitizeForUse(request.CompanyRegistrationCode);
        // Bad user names don't go any further
        if (sanitizedUserName != request.UserName)
            throw new InvalidOperationException("Username is not valid.");

        // Validate registration code
        var registrationCode = await _context.RegistrationCodes
            .Include(rc => rc.Organization)
            .FirstOrDefaultAsync(rc => rc.Code == sanitizedCompanyRegistrationCode && !rc.IsUsed);

        if (registrationCode == null)
            throw new InvalidOperationException("Invalid registration code");

        // Check if code has expired
        if (registrationCode.ExpiresOn < DateTime.UtcNow)
            throw new InvalidOperationException("Registration code has expired");

        var organization = registrationCode.Organization;

        // Check if organization is enabled
        if (!organization.IsEnabled)
            throw new InvalidOperationException("Organization is disabled");

        // Check if email is already in use
        if (await _context.SystemUsers.AsNoTracking().AnyAsync(u => u.EmailAddress == sanitizedEmail))
            throw new InvalidOperationException("Email address is already in use");

        // Check if userName is already in use
        if (await _context.SystemUsers.AsNoTracking().AnyAsync(u => u.UserName == sanitizedUserName))
            throw new InvalidOperationException("Username is already in use");

        // Get active license subscription
        var subscription = await _context.LicenseSubscriptions
            .AsNoTracking()
            .Where(ls => ls.OrganizationId == organization.OrganizationId && ls.IsActive)
            .OrderByDescending(ls => ls.StartDate)
            .FirstOrDefaultAsync();

        if (subscription == null)
            throw new InvalidOperationException("Organization does not have an active license");

        // Check if max users limit has been reached
        var currentUserCount = await _context.SystemUsers
            .AsNoTracking()
            .CountAsync(u => u.OrganizationId == organization.OrganizationId);

        var licenseFeatures = LicenseFeatures.GetFeaturesForTier(subscription.Tier);
        if (currentUserCount >= licenseFeatures.MaxUsers)
            throw new InvalidOperationException($"Maximum user limit ({licenseFeatures.MaxUsers}) has been reached for your organization's license tier");

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        var sanitizedFirstName = StringSanitizer.SanitizeForLog(request.FirstName);
        var sanitizedLastName = StringSanitizer.SanitizeForLog(request.LastName);

        var user = new SystemUser
        {
            UserId = Guid.NewGuid(),
            EmailAddress = sanitizedEmail,
            UserName = sanitizedUserName,
            PasswordHash = passwordHash,
            FirstName = sanitizedFirstName,
            LastName = sanitizedLastName,
            OrganizationId = organization.OrganizationId,
            UserRole = UserRoles.User,
            IsEnabled = true,
            CreatedOn = DateTime.UtcNow
        };

        // Mark registration code as used
        registrationCode.IsUsed = true;
        registrationCode.UsedByUserId = user.UserId;
        registrationCode.UsedOn = DateTime.UtcNow;

        await _context.SystemUsers.AddAsync(user);
        await _context.SaveChangesAsync();

        return new AuthResponse
        {
            UserId = user.UserId,
            UserName = user.UserName,
            Email = user.EmailAddress,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.UserRole,
            OrganizationId = user.OrganizationId,
            OrganizationName = organization.OrganizationName,
            LicenseTier = subscription.Tier,
            RegistrationToken = organization.RegistrationToken
        };
    }

    public async Task<CompanyRegistrationResponse> RegisterCompanyAsync(RegisterCompanyRequest request)
    {
        string sanitizedAdminUserName = StringSanitizer.SanitizeForUse(request.AdminUserName);
        string sanitizedAdminEmail = StringSanitizer.SanitizeForUse(request.AdminEmail);
        string sanitizedEmail = StringSanitizer.SanitizeForUse(request.Email);

        // Bad user names don't go any further
        if (sanitizedAdminUserName != request.AdminUserName)
            throw new InvalidOperationException("Username is not valid.");


        // Check if company email is already in use
        if (await _context.Organizations.AsNoTracking().AnyAsync(o => o.PrimaryEmail == sanitizedEmail))
            throw new InvalidOperationException("Company email is already in use");

        // Check if admin email is already in use
        if (await _context.SystemUsers.AsNoTracking().AnyAsync(u => u.EmailAddress == sanitizedAdminEmail))
            throw new InvalidOperationException("Admin email is already in use");

        // Check if admin userName is already in use
        if (await _context.SystemUsers.AsNoTracking().AnyAsync(u => u.UserName == sanitizedAdminUserName))
            throw new InvalidOperationException("Username is already in use");

        // Create a unique registration token
        var registrationToken = Guid.NewGuid().ToString("N");

        // Create organization
        var sanitizedCompanyName = StringSanitizer.SanitizeForUse(request.CompanyName);
        var sanitizedAddressLine1 = StringSanitizer.SanitizeForUse(request.AddressLine1);
        var sanitizedAddressLine2 = StringSanitizer.SanitizeForUse(request.AddressLine2);
        var sanitizedAddressLine3 = StringSanitizer.SanitizeForUse(request.AddressLine3);
        var sanitizedLocality = StringSanitizer.SanitizeForUse(request.Locality);
        var sanitizedRegion = StringSanitizer.SanitizeForUse(request.Region);
        var sanitizedPostalCode = StringSanitizer.SanitizeForLog(request.PostalCode);
        var sanitizedCountryCode = StringSanitizer.SanitizeForLog(request.CountryCode);

        var organization = new Organization
        {
            OrganizationId = Guid.NewGuid(),
            OrganizationName = sanitizedCompanyName,
            PrimaryEmail = sanitizedEmail,
            AddressLine1 = sanitizedAddressLine1,
            AddressLine2 = sanitizedAddressLine2,
            AddressLine3 = sanitizedAddressLine3,
            Locality = sanitizedLocality,
            Region = sanitizedRegion,
            PostalCode = sanitizedPostalCode,
            CountryCode = sanitizedCountryCode,
            RegistrationToken = registrationToken,
            IsEnabled = true,
            CreatedOn = DateTime.UtcNow,
            ModifiedOn = DateTime.UtcNow
        };

        // Create license subscription
        var subscription = new LicenseSubscription
        {
            SubscriptionId = Guid.NewGuid(),
            OrganizationId = organization.OrganizationId,
            Tier = request.LicenseTier,
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddYears(1),
            IsActive = true,
            CreatedOn = DateTime.UtcNow,
            ModifiedOn = DateTime.UtcNow
        };

        // Create admin user
        var adminPasswordHash = BCrypt.Net.BCrypt.HashPassword(request.AdminPassword);
        var sanitizedFirstName = StringSanitizer.SanitizeForLog(request.AdminFirstName);
        var sanitizedLastName = StringSanitizer.SanitizeForLog(request.AdminLastName);
        var adminUser = new SystemUser
        {
            UserId = Guid.NewGuid(),
            EmailAddress = sanitizedAdminEmail,
            UserName = sanitizedAdminUserName,
            PasswordHash = adminPasswordHash,
            FirstName = sanitizedFirstName,
            LastName = sanitizedLastName,
            OrganizationId = organization.OrganizationId,
            UserRole = UserRoles.CompanyAdmin,
            IsEnabled = true,
            CreatedOn = DateTime.UtcNow
        };

        // Save everything
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            await _context.Organizations.AddAsync(organization);
            await _context.LicenseSubscriptions.AddAsync(subscription);
            await _context.SystemUsers.AddAsync(adminUser);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        return new CompanyRegistrationResponse
        {
            OrganizationId = organization.OrganizationId,
            CompanyName = organization.OrganizationName,
            RegistrationToken = organization.RegistrationToken,
            LicenseTier = subscription.Tier,
            AdminAuth = new AuthResponse
            {
                UserId = adminUser.UserId,
                UserName = adminUser.UserName,
                Email = adminUser.EmailAddress,
                FirstName = adminUser.FirstName,
                LastName = adminUser.LastName,
                Role = adminUser.UserRole,
                OrganizationId = organization.OrganizationId,
                OrganizationName = organization.OrganizationName,
                LicenseTier = subscription.Tier
            }
        };
    }

    public async Task<bool> IsUserNameAvailableAsync(string userName)
    {
        return !await _context.SystemUsers.AsNoTracking().AnyAsync(u => u.UserName == userName);
    }

    public async Task RequestPasswordResetCodeAsync(string email)
    {
        var normalizedEmail = (email ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(normalizedEmail))
        {
            return;
        }

        var user = await _context.SystemUsers
            .FirstOrDefaultAsync(u => u.EmailAddress == normalizedEmail && u.IsEnabled);

        // Always return success shape at controller level to prevent account enumeration.
        if (user == null)
        {
            return;
        }

        var code = GeneratePasswordResetCode();
        var expiresOnUtc = DateTime.UtcNow.AddMinutes(15);

        user.PasswordResetCodeHash = BCrypt.Net.BCrypt.HashPassword(code);
        user.PasswordResetCodeExpiresOn = expiresOnUtc;

        await _context.SaveChangesAsync();
        await _emailService.SendPasswordResetCodeEmailAsync(user.EmailAddress, user.FirstName, code, expiresOnUtc);
    }

    public async Task RequestUsernameReminderAsync(string email)
    {
        var normalizedEmail = (email ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(normalizedEmail))
        {
            return;
        }

        var users = await _context.SystemUsers
            .AsNoTracking()
            .Where(u => u.EmailAddress == normalizedEmail && u.IsEnabled)
            .OrderBy(u => u.CreatedOn)
            .ToListAsync();

        // Always return success shape at controller level to prevent account enumeration.
        if (users.Count == 0)
        {
            return;
        }

        var userNames = users
            .Select(u => u.UserName)
            .Where(u => !string.IsNullOrWhiteSpace(u))
            .Distinct(StringComparer.Ordinal)
            .ToList();

        if (userNames.Count == 0)
        {
            return;
        }

        var firstName = users.FirstOrDefault(u => !string.IsNullOrWhiteSpace(u.FirstName))?.FirstName
            ?? "there";

        await _emailService.SendUsernameReminderEmailAsync(normalizedEmail, firstName, userNames);
    }

    public async Task ResetPasswordWithCodeAsync(string email, string code, string newPassword)
    {
        var normalizedEmail = (email ?? string.Empty).Trim();
        var normalizedCode = (code ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(normalizedEmail) || string.IsNullOrWhiteSpace(normalizedCode))
        {
            throw new InvalidOperationException("Email and code are required.");
        }

        if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 8)
        {
            throw new InvalidOperationException("New password must be at least 8 characters.");
        }

        var user = await _context.SystemUsers
            .FirstOrDefaultAsync(u => u.EmailAddress == normalizedEmail && u.IsEnabled);

        if (user == null)
        {
            throw new InvalidOperationException("Invalid reset request.");
        }

        var now = DateTime.UtcNow;

        if (string.IsNullOrEmpty(user.PasswordResetCodeHash)
            || user.PasswordResetCodeExpiresOn == null
            || user.PasswordResetCodeExpiresOn <= now
            || !BCrypt.Net.BCrypt.Verify(normalizedCode, user.PasswordResetCodeHash))
        {
            throw new InvalidOperationException("Invalid or expired reset code.");
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.PasswordResetCodeHash = null;
        user.PasswordResetCodeExpiresOn = null;

        await _context.SaveChangesAsync();
        await RevokeAllUserTokensAsync(user.UserId, releaseBindings: true);
    }

    public async Task<bool> RevokeRefreshTokenAsync(string refreshToken)
    {
        var session = await _context.UserSessions
            .FirstOrDefaultAsync(s => s.SessionToken == refreshToken);
        if (session == null)
            return false;

        var hadActiveSession = session.IsActive;
        if (session.IsActive)
        {
            session.IsActive = false;
        }

        var cleanup = await ReleaseBindingsAndClearLocksAsync(
            filterByUserId: null,
            sessionIds: new[] { session.SessionId },
            unboundByUserId: session.UserId,
            reason: "REVOKE_REFRESH_TOKEN",
            releaseBindings: true);

        if (hadActiveSession && cleanup.releasedBindings == 0 && cleanup.clearedLocks == 0)
        {
            await _context.SaveChangesAsync();
        }

        return hadActiveSession || cleanup.releasedBindings > 0 || cleanup.clearedLocks > 0;
    }

    public async Task<bool> RevokeAllUserTokensAsync(Guid userId, bool releaseBindings = false)
    {
        var sessions = await _context.UserSessions
            .Where(s => s.UserId == userId && s.IsActive)
            .ToListAsync();

        foreach (var session in sessions)
        {
            session.IsActive = false;
        }

        var cleanup = await ReleaseBindingsAndClearLocksAsync(
            filterByUserId: userId,
            sessionIds: sessions.Select(s => s.SessionId),
            unboundByUserId: userId,
            reason: "REVOKE_ALL_USER_TOKENS",
            includeAllUserBindings: true,
            releaseBindings: releaseBindings);

        if (sessions.Any() && cleanup.releasedBindings == 0 && cleanup.clearedLocks == 0)
        {
            await _context.SaveChangesAsync();
        }

        return sessions.Any() || cleanup.releasedBindings > 0 || cleanup.clearedLocks > 0;
    }

    public async Task<(AuthResponse? response, bool isIdleTimeout)> RefreshTokenAsync(string refreshToken, Guid? organizationId = null, long? terminalId = null)
    {
        // Validate refresh token format
        if (!_tokenService.ValidateRefreshToken(refreshToken))
            return (null, false);

        // Find active session with this refresh token
        var session = await _context.UserSessions
            .Include(s => s.User)
            .ThenInclude(u => u.Organization)
            .FirstOrDefaultAsync(s => s.SessionToken == refreshToken && s.IsActive && s.ExpiresOn > DateTime.UtcNow);

        if (session == null)
            return (null, false);

        if (session.User == null)
        {
            _logger.LogWarning("[RefreshTokenAsync] Session {SessionId} has no linked user. Marking inactive.", session.SessionId);
            session.IsActive = false;
            await _context.SaveChangesAsync();
            return (null, false);
        }

        var user = session.User;
        var organization = user.Organization;

        if (organization == null)
        {
            _logger.LogWarning("[RefreshTokenAsync] User {UserId} has no linked organization. Marking session {SessionId} inactive.", user.UserId, session.SessionId);
            session.IsActive = false;
            await _context.SaveChangesAsync();
            return (null, false);
        }

        if (!organization.IsEnabled || !user.IsEnabled)
            return (null, false);

        // CRITICAL SECURITY FIX (Jan 2026): DO NOT check idle timeout in RefreshTokenAsync!
        // The entire PURPOSE of refresh tokens is to RECOVER from idle sessions.
        // Idle timeout enforcement happens in TerminalIdleTimeoutMiddleware for protected routes.
        // If we reject refresh here, users can never use PIN signin after idle timeout.
        // 
        // The middleware detects idle sessions and returns 401 with idle_timeout reason.
        // The interceptor catches this and navigates to /pin-signin.
        // PIN signin refreshes the access token (this method) to get a valid JWT.
        // THEN it loads the org's PIN users for selection.
        //
        // Removed idle timeout check that was blocking refresh token flow (lines 429-447).
        // Idle timeout check removed - refresh tokens now work even when session is idle

        // NOTE: Do NOT update session.LastAccessedOn here!
        // The middleware will handle updating LastAccessedOn only for actual user actions.
        // Refresh token is a background request that shouldn't reset the idle timeout.
        // If we update here, idle users who periodically refresh tokens would never timeout.

        // Extend refresh token expiration (sliding window with absolute maximum cap)
        var refreshTokenExpirationDays = _configuration.GetValue<int>("Paseto:RefreshTokenExpirationDays", 30);
        var maxSessionDurationDays = _configuration.GetValue<int>("Paseto:MaxSessionDurationDays", 90);
        
        var newExpiration = DateTime.UtcNow.AddDays(refreshTokenExpirationDays);
        var absoluteMaxExpiration = session.CreatedOn.AddDays(maxSessionDurationDays);
        
        // Use the earlier of the two dates (prevents exceeding absolute max)
        session.ExpiresOn = newExpiration > absoluteMaxExpiration 
            ? absoluteMaxExpiration  // Cap at max session duration from login
            : newExpiration;         // Otherwise extend by configured days
            _logger.LogDebug($"[RefreshTokenAsync] Extending session expiration to {session.ExpiresOn} (CreatedOn: {session.CreatedOn}, NewExpiration: {newExpiration}, AbsoluteMax: {absoluteMaxExpiration})");
        await _context.SaveChangesAsync();

        // Get license subscription
        var subscription = await _context.LicenseSubscriptions
            .AsNoTracking()
            .Where(ls => ls.OrganizationId == user.OrganizationId && ls.IsActive)
            .OrderByDescending(ls => ls.StartDate)
            .FirstOrDefaultAsync();

        var licenseTier = subscription?.Tier ?? LicenseTier.Basic;

        // Preserve terminal context claim on refreshed access tokens when available.
        // Priority: active binding for this session -> current authenticated claim fallback.
        Guid? terminalUidForToken = await _context.TerminalDeviceBindings
            .AsNoTracking()
            .Where(b => b.IsActive && b.SessionId == session.SessionId)
            .Join(
                _context.Terminals.AsNoTracking(),
                b => b.TerminalId,
                t => t.TerminalId,
                (b, t) => (Guid?)t.TerminalUid)
            .FirstOrDefaultAsync();

        if (!terminalUidForToken.HasValue)
        {
            var terminalClaim = _httpContextAccessor.HttpContext?.User?.FindFirst("terminal_id")?.Value;
            if (!string.IsNullOrWhiteSpace(terminalClaim) && Guid.TryParse(terminalClaim, out var parsedTerminalUid))
            {
                terminalUidForToken = parsedTerminalUid;
            }
        }

        // Generate new access token using the SAME session id (jti) as the refresh-token session.
        // This keeps middleware session validation consistent across refresh cycles.
        string accessToken;
        try
        {
            accessToken = _tokenService.GenerateAccessToken(user, terminalUidForToken, session.SessionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[RefreshTokenAsync] Failed to generate access token for session {SessionId}, user {UserId}", session.SessionId, user.UserId);
            return (null, false);
        }

        return (new AuthResponse
        {
            UserId = user.UserId,
            UserName = user.UserName,
            Email = user.EmailAddress,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.UserRole,
            OrganizationId = user.OrganizationId,
            OrganizationName = organization.OrganizationName,
            LicenseTier = licenseTier,
            RegistrationToken = organization.RegistrationToken,
            AccessToken = accessToken,
            RefreshToken = refreshToken // Return same refresh token
        }, false); // Not an idle timeout
    }

    public async Task<AuthResponse?> PinLoginAsync(PinLoginRequest request, Guid? terminalId = null)
    {
        if (!Guid.TryParse(request.UserId, out var userId))
            return null;

        var user = await _context.SystemUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.UserId == userId && u.PinHash != null);

        if (user == null)
            return null;

        Terminal? pinTerminalContext = null;
        // Validate terminal organization match if terminalId provided (strict lock)
        if (terminalId.HasValue)
        {
            pinTerminalContext = await _context.Terminals
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TerminalUid == terminalId.Value && t.IsActive);

            if (pinTerminalContext != null && pinTerminalContext.OrganizationId != user.OrganizationId)
            {
                // Terminal is bound to a different organization - PIN login rejected
                throw new UnauthorizedAccessException("This terminal is bound to a different organization. Contact your administrator.");
            }
        }

        // Check if PIN is locked
        if (user.PinLockedUntil.HasValue && user.PinLockedUntil.Value > DateTime.UtcNow)
            return null;

        // Verify PIN
        if (!BCrypt.Net.BCrypt.Verify(request.Pin, user.PinHash))
        {
            // Increment attempts
            user.PinAttempts++;
            
            // Lock PIN if too many attempts
            if (user.PinAttempts >= 5)
            {
                user.PinLockedUntil = DateTime.UtcNow.AddMinutes(15);
            }
            
            await _context.SaveChangesAsync();
            return null;
        }

        // Reset attempts on successful login
        user.PinAttempts = 0;
        user.LastLoginOn = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var organization = await _context.Organizations
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.OrganizationId == user.OrganizationId);

        if (organization == null)
            throw new InvalidOperationException("Organization not found");

        var subscription = await _context.LicenseSubscriptions
            .Where(ls => ls.OrganizationId == user.OrganizationId && ls.IsActive)
            .AsNoTracking()
            .OrderByDescending(ls => ls.StartDate)
            .FirstOrDefaultAsync();

        var licenseTier = subscription?.Tier ?? LicenseTier.Basic;

        // Pre-generate session ID so it can be embedded in the access token as jti
        var sessionId = Guid.NewGuid();

        // Generate tokens using PASETO, include terminalId and sessionId
        var accessToken = _tokenService.GenerateAccessToken(user, terminalId, sessionId);
        var refreshToken = _tokenService.GenerateRefreshToken();

        // Store refresh token in DB
        var userSession = new UserSession
        {
            SessionId = sessionId,
            UserId = user.UserId,
            SessionToken = refreshToken,
            IpAddress = _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString(),
            UserAgent = _httpContextAccessor.HttpContext?.Request.Headers["User-Agent"].ToString(),
            CreatedOn = DateTime.UtcNow,
            LastAccessedOn = DateTime.UtcNow,
            ExpiresOn = DateTime.UtcNow.AddDays(_configuration.GetValue<int>("Paseto:RefreshTokenExpirationDays", 30)),
            IsActive = true
        };
        _context.UserSessions.Add(userSession);
        await _context.SaveChangesAsync();

        // Activate terminal session if terminal is provided (unlocks if previously locked, marks as active)
        if (terminalId.HasValue && terminalId != Guid.Empty)
        {
            var terminal = await _context.Terminals
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TerminalUid == terminalId.Value && t.IsActive);
            if (terminal != null)
            {
                _logger.LogInformation("terminal {terminalId} and org {OrgId}", terminalId, user.OrganizationId);
                await _terminalLockService.ActivateTerminalSessionAsync(user.OrganizationId, terminal.TerminalId);
            }
            
            // Refresh user session activity timestamp after terminal activation to reset idle timeout
            userSession.LastAccessedOn = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return new AuthResponse
        {
            UserId = user.UserId,
            UserName = user.UserName,
            Email = user.EmailAddress,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.UserRole,
            OrganizationId = user.OrganizationId,
            OrganizationName = organization.OrganizationName,
            LicenseTier = licenseTier,
            RegistrationToken = organization.RegistrationToken,
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            TerminalId = pinTerminalContext?.TerminalUid,
            TerminalCode = pinTerminalContext?.TerminalCode,
            Location = pinTerminalContext?.Location
        };
    }
}