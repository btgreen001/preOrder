using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using PreOrderApp.Models;
using PreOrderApp.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;

namespace PreOrderApp.Controllers;

public class PinUser
{
    public string UserId { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool HasPinEnabled { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly PreOrderApp.Data.AppDbContext _context;
    private readonly ITerminalLockService _terminalLockService;
    private readonly IOrganizationContextService _orgContext;
    private readonly ILogger<AuthController> _logger;
    private readonly IConfiguration _configuration;

    public AuthController(
        IAuthService authService, 
        PreOrderApp.Data.AppDbContext context,
        ITerminalLockService terminalLockService,
        IOrganizationContextService orgContext,
        ILogger<AuthController> logger,
        IConfiguration configuration)
    {
        _authService = authService;
        _context = context;
        _terminalLockService = terminalLockService;
        _orgContext = orgContext;
        _logger = logger;
        _configuration = configuration;
    }

    /// <summary>
    /// Helper to properly delete refreshToken cookie with matching properties
    /// CRITICAL: Cookie delete requires matching Path, Domain, SameSite, Secure properties
    /// </summary>
    private void DeleteRefreshTokenCookie()
    {
        Response.Cookies.Delete("refreshToken", new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Strict,
            Path = "/"
        });
    }

    [HttpGet("profile/{username}")]
    public async Task<ActionResult<AuthResponse>> GetProfile(string username)
    {
        // Find user by username
            var user = await _context.SystemUsers.FirstOrDefaultAsync(u => u.UserName == username);
        if (user == null)
            return NotFound();

        var org = await _context.Organizations.FirstOrDefaultAsync(o => o.OrganizationId == user.OrganizationId);
        if (org == null)
            return NotFound();

        var sub = await _context.LicenseSubscriptions
            .Where(ls => ls.OrganizationId == user.OrganizationId && ls.IsActive)
            .OrderByDescending(ls => ls.StartDate)
            .FirstOrDefaultAsync();
        var licenseTier = sub?.Tier ?? LicenseTier.Basic;

        var resp = new AuthResponse
        {
            UserId = user.UserId,
            UserName = user.UserName,
            Email = user.EmailAddress,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.UserRole,
            OrganizationId = user.OrganizationId,
            OrganizationName = org.OrganizationName,
            LicenseTier = licenseTier,
            RegistrationToken = org.RegistrationToken,
            HasCompletedOnboarding = user.HasCompletedOnboarding
        };
        return Ok(resp);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<AuthResponse>> GetMyProfile()
    {
        var userId = _orgContext.GetCurrentUserId();
        var user = await _context.SystemUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.UserId == userId && u.IsEnabled);

        if (user == null)
        {
            return NotFound(new { message = "User not found." });
        }

        var org = await _context.Organizations
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.OrganizationId == user.OrganizationId);

        if (org == null)
        {
            return NotFound(new { message = "Organization not found." });
        }

        var sub = await _context.LicenseSubscriptions
            .AsNoTracking()
            .Where(ls => ls.OrganizationId == user.OrganizationId && ls.IsActive)
            .OrderByDescending(ls => ls.StartDate)
            .FirstOrDefaultAsync();

        return Ok(new AuthResponse
        {
            UserId = user.UserId,
            UserName = user.UserName,
            Email = user.EmailAddress,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.UserRole,
            OrganizationId = user.OrganizationId,
            OrganizationName = org.OrganizationName,
            LicenseTier = sub?.Tier ?? LicenseTier.Basic,
            RegistrationToken = org.RegistrationToken,
            HasCompletedOnboarding = user.HasCompletedOnboarding
        });
    }

    [HttpPost("me/onboarding-complete")]
    [Authorize]
    public async Task<IActionResult> MarkOnboardingComplete()
    {
        var userId = _orgContext.GetCurrentUserId();
        var updated = await _authService.SetOnboardingCompletedAsync(userId);

        return Ok(new
        {
            message = updated ? "Onboarding status updated." : "Onboarding was already completed.",
            hasCompletedOnboarding = true
        });
    }

    [HttpPut("me/profile")]
    [Authorize]
    public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateMyProfileRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.LastName))
        {
            return BadRequest(new { message = "Email, first name, and last name are required." });
        }

        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
        {
            return BadRequest(new { message = "Current password is required to save profile changes." });
        }

        var userId = _orgContext.GetCurrentUserId();
        var user = await _context.SystemUsers.FirstOrDefaultAsync(u => u.UserId == userId && u.IsEnabled);
        if (user == null)
        {
            return NotFound(new { message = "User not found." });
        }

        if (string.IsNullOrWhiteSpace(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
        {
            return BadRequest(new { message = "Current password is incorrect." });
        }

        var wantsPasswordChange = !string.IsNullOrWhiteSpace(request.NewPassword) || !string.IsNullOrWhiteSpace(request.ReenterNewPassword);
        if (wantsPasswordChange)
        {
            if (string.IsNullOrWhiteSpace(request.NewPassword) || string.IsNullOrWhiteSpace(request.ReenterNewPassword))
            {
                return BadRequest(new { message = "Enter and re-enter the new password to change it." });
            }

            if (!string.Equals(request.NewPassword, request.ReenterNewPassword, StringComparison.Ordinal))
            {
                return BadRequest(new { message = "New password and re-entered password do not match." });
            }
        }

        var normalizedEmail = request.Email.Trim();
        var emailInUse = await _context.SystemUsers
            .AsNoTracking()
            .AnyAsync(u => u.UserId != userId && u.EmailAddress == normalizedEmail);

        if (emailInUse)
        {
            return BadRequest(new { message = "Email address is already in use." });
        }

        user.EmailAddress = normalizedEmail;
        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();

        if (wantsPasswordChange)
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword!);
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Profile updated.",
            user = new
            {
                user.UserId,
                user.UserName,
                Email = user.EmailAddress,
                user.FirstName,
                user.LastName
            }
        });
    }

    [AllowAnonymous]
    [HttpPost("register-user")]
    public async Task<ActionResult<AuthResponse>> RegisterUser(RegisterUserRequest request)
    {
        try
        {
            var response = await _authService.RegisterUserAsync(request);
            
            // Set refresh token in HttpOnly cookie
            if (!string.IsNullOrEmpty(response.RefreshToken))
            {
                // Delete any existing refresh token cookie first to avoid duplicates
                DeleteRefreshTokenCookie();
                
                Response.Cookies.Append("refreshToken", response.RefreshToken, new Microsoft.AspNetCore.Http.CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,  // HTTPS only
                    SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Strict
                    // Session-only cookie - cleared when browser closes
                    // CRITICAL for terminal/kiosk security
                });
                response.RefreshToken = null;
            }
            
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("register-company")]
    public async Task<ActionResult<CompanyRegistrationResponse>> RegisterCompany(RegisterCompanyRequest request)
    {
        try
        {
            var response = await _authService.RegisterCompanyAsync(request);
            
            // Set refresh token in HttpOnly cookie for admin auth
            if (!string.IsNullOrEmpty(response.AdminAuth?.RefreshToken))
            {
                // Delete any existing refresh token cookie first to avoid duplicates
                DeleteRefreshTokenCookie();
                
                Response.Cookies.Append("refreshToken", response.AdminAuth.RefreshToken, new Microsoft.AspNetCore.Http.CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,  // HTTPS only
                    SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Strict
                    // Session-only cookie - cleared when browser closes
                    // CRITICAL for terminal/kiosk security
                });
                response.AdminAuth.RefreshToken = null;
            }
            
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        try
        {
            var response = await _authService.LoginAsync(request, request.TerminalId);
            if (response == null)
                  return Unauthorized(new { message = "Invalid userName or password" });

            // Set refresh token in HttpOnly cookie
            if (!string.IsNullOrEmpty(response.RefreshToken))
            {
                // Delete any existing refresh token cookie first to avoid duplicates
                DeleteRefreshTokenCookie();
                
                Response.Cookies.Append("refreshToken", response.RefreshToken, new Microsoft.AspNetCore.Http.CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,  // HTTPS only
                    SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Strict
                    // Session-only cookie - cleared when browser closes
                    // CRITICAL for terminal/kiosk security
                });
                
                // Remove refresh token from response body for security
                response.RefreshToken = null;
            }

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            // Map service-level validation failures to a friendly 400 payload
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            // Return 403 Forbidden with error message for invalid/wrong-org terminal
            return StatusCode(403, new { message = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("forgot-password/code")]
    public async Task<IActionResult> RequestPasswordResetCode([FromBody] ForgotPasswordCodeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new { message = "Email is required." });
        }

        await _authService.RequestPasswordResetCodeAsync(request.Email);
        return Ok(new { message = "If that email exists in our system, a reset code has been sent." });
    }

    [AllowAnonymous]
    [HttpPost("forgot-username")]
    public async Task<IActionResult> RequestUsernameReminder([FromBody] ForgotUsernameRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new { message = "Email is required." });
        }

        await _authService.RequestUsernameReminderAsync(request.Email);
        return Ok(new { message = "If that email exists in our system, your username will been sent." });
    }

    [AllowAnonymous]
    [HttpPost("forgot-password/reset")]
    public async Task<IActionResult> ResetPasswordWithCode([FromBody] ResetPasswordWithCodeRequest request)
    {
        try
        {
            await _authService.ResetPasswordWithCodeAsync(request.Email, request.Code, request.NewPassword);
            return Ok(new { message = "Password has been reset successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("revoke-token")]
    public async Task<IActionResult> RevokeToken()
    {
        // Read refresh token from HttpOnly cookie
        if (!Request.Cookies.TryGetValue("refreshToken", out var refreshToken) || string.IsNullOrEmpty(refreshToken))
        {
            return BadRequest(new { message = "No refresh token provided" });
        }

        var success = await _authService.RevokeRefreshTokenAsync(refreshToken);
        if (!success)
            return NotFound("Token not found or already revoked");

        // Delete the cookie
        DeleteRefreshTokenCookie();

        return Ok("Token revoked");
    }
    
    [AllowAnonymous]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        // Always clear cookies regardless of token validity.
        // [AllowAnonymous] ensures this runs even with an expired/missing access token.
        Request.Cookies.TryGetValue("refreshToken", out var refreshToken);

        await _authService.LogoutAsync(
            string.IsNullOrWhiteSpace(refreshToken) ? null : refreshToken,
            "USER_LOGOUT");

        DeleteRefreshTokenCookie();
        return Ok(new { message = "Logged out successfully" });
    }

    [AllowAnonymous]
    [HttpPost("logout-all")]
    public async Task<IActionResult> LogoutAll()
    {
        // Always clear cookies regardless of token validity.
        // Extract user ID from JWT manually — [Authorize] is not used here.
        Guid? userId = null;
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out var parsedUserId))
        {
            userId = parsedUserId;
        }

        Request.Cookies.TryGetValue("refreshToken", out var refreshToken);

        await _authService.LogoutAllAsync(
            userId,
            string.IsNullOrWhiteSpace(refreshToken) ? null : refreshToken,
            "USER_LOGOUT");

        DeleteRefreshTokenCookie();
        return Ok(new { message = "Logged out successfully" });
    }

    [AllowAnonymous]
    [HttpPost("refresh-token")]
    public async Task<ActionResult<AuthResponse>> RefreshToken()
    {
        // Read refresh token from HttpOnly cookie
        if (!Request.Cookies.TryGetValue("refreshToken", out var refreshToken) || string.IsNullOrEmpty(refreshToken))
        {
            return Unauthorized(new { message = "No refresh token provided" });
        }

        // Extract terminal ID from header or query for idle timeout check
        Guid? organizationId = null;
        long? terminalId = null;

        var terminalIdHeader = Request.Headers["X-Terminal-Id"].ToString();
        var terminalIdQuery = Request.Query["terminalId"].ToString();
        
        if (!string.IsNullOrEmpty(terminalIdHeader) || !string.IsNullOrEmpty(terminalIdQuery))
        {
            if (_orgContext.TryGetCurrentOrganizationId(out var orgId))
            {
                organizationId = orgId;
                var terminalIdStr = !string.IsNullOrEmpty(terminalIdHeader) ? terminalIdHeader : terminalIdQuery;
                
                if (long.TryParse(terminalIdStr, out var tId))
                {
                    terminalId = tId;
                }
            }
        }

        // Pass terminal info to refresh token check (will lock terminal and logout if idle)
        AuthResponse? response;
        bool isIdleTimeout;
        try
        {
            (response, isIdleTimeout) = await _authService.RefreshTokenAsync(refreshToken, organizationId, terminalId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected exception during refresh-token processing");
            DeleteRefreshTokenCookie();
            return Unauthorized(new { message = "Invalid or expired refresh token" });
        }

        if (response == null)
        {
            // Distinguish between idle timeout and other auth failures
            if (isIdleTimeout)
            {
                return Unauthorized(new { message = "Session expired due to inactivity", reason = "idle_timeout" });
            }
            else
            {
                return Unauthorized(new { message = "Invalid or expired refresh token" });
            }
        }

        // Check if terminal is locked (if terminal ID provided in header or query)
        Terminal? lockedTerminal = null;
        try
        {
            if (organizationId.HasValue && terminalId.HasValue)
            {
                bool isLocked = await _terminalLockService.IsTerminalLockedAsync(
                    organizationId.Value, 
                    terminalId.Value);

                if (isLocked)
                {
                    var currentLock = await _terminalLockService.GetCurrentLockAsync(
                        organizationId.Value, 
                        terminalId.Value);
                    
                    lockedTerminal = await _context.Terminals
                        .FirstOrDefaultAsync(t => t.TerminalId == terminalId.Value);

                    _logger.LogWarning(
                        "Terminal refresh token requested while terminal {TerminalId} is locked", 
                        terminalId);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error checking terminal lock status during refresh");
            // Continue with refresh even if terminal check fails (fail-open design)
        }

        // If terminal is locked, renew refresh token but don't issue access token
        if (lockedTerminal != null)
        {
            // Set new refresh token in HttpOnly cookie to keep session alive
            if (!string.IsNullOrEmpty(response.RefreshToken))
            {
                DeleteRefreshTokenCookie();
                
                Response.Cookies.Append("refreshToken", response.RefreshToken, new Microsoft.AspNetCore.Http.CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,  // HTTPS only
                    SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Strict
                    // Session-only cookie - cleared when browser closes
                    // CRITICAL for terminal/kiosk security
                });
                
                response.RefreshToken = null;
            }

            // Return 403 with lock info and no access token
            return StatusCode(403, new
            {
                success = false,
                error = "TERMINAL_LOCKED",
                message = $"Terminal {lockedTerminal.TerminalCode} is locked",
                terminal = new
                {
                    terminalId = lockedTerminal.TerminalId,
                    terminalCode = lockedTerminal.TerminalCode,
                    location = lockedTerminal.Location,
                    lockedAt = DateTime.UtcNow
                }
            });
        }

        // Normal refresh token flow when terminal not locked
        // Set new refresh token in HttpOnly cookie
        if (!string.IsNullOrEmpty(response.RefreshToken))
        {
            // Delete old refresh token cookie first to avoid duplicates
            DeleteRefreshTokenCookie();
            
            Response.Cookies.Append("refreshToken", response.RefreshToken, new Microsoft.AspNetCore.Http.CookieOptions
            {
                HttpOnly = true,
                Secure = true,  // HTTPS only
                SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Strict
                // Session-only cookie - cleared when browser closes
                // CRITICAL for terminal/kiosk security
            });
            
            // Remove refresh token from response body
            response.RefreshToken = null;
        }

        // SECURITY: Do NOT return terminal context in refresh-token response
        // Terminal context should ONLY come from fresh login/PIN-login, not from session refresh
        // If we returned terminal context here, it would defeat the idle timeout tab-reload guard
        // The guard relies on terminal context being lost when tab reloads
        response.TerminalId = null;
        response.TerminalCode = null;
        response.Location = null;

        return Ok(response);
    }

    [AllowAnonymous]  // Get list of organizations (for PIN signin discovery)
    [HttpGet("organizations")]
    public async Task<ActionResult<IEnumerable<object>>> GetOrganizations()
    {
        // Return list of all active organizations that have PIN-enabled users
        var organizations = await _context.Organizations
            .Where(o => _context.SystemUsers.Any(u => u.OrganizationId == o.OrganizationId && u.PinHash != null && u.IsEnabled))
            .Select(o => new 
            { 
                organizationId = o.OrganizationId,
                organizationName = o.OrganizationName 
            })
            .ToListAsync();

        return Ok(organizations);
    }

    [AllowAnonymous]  // PIN users endpoint must be accessible during idle timeout
    [HttpPost("pin-users")]
    public async Task<ActionResult<IEnumerable<PinUser>>> GetPinUsers([FromBody] GetPinUsersRequest? request)
    {
        // SECURITY: For PIN signin, we accept organizationId from terminal context
        // Terminal context was set during authenticated login and persists through logout
        // Security comes from the login flow that set this context, not from validating it here
        
        Guid? orgId = null;
        
        // For authenticated users, use JWT token org_id (most secure)
        if (User?.Identity?.IsAuthenticated == true)
        {
            var organizationIdClaim = User.FindFirst("org_id");
            if (organizationIdClaim != null && Guid.TryParse(organizationIdClaim.Value, out var tokenOrgId))
            {
                orgId = tokenOrgId;
            }
        }
        
        // For idle timeout or new terminal binding, accept organizationId from request body
        if (orgId == null && request?.OrganizationId != null && Guid.TryParse(request.OrganizationId, out var paramOrgId))
        {
            orgId = paramOrgId;
        }
        
        // If still no organization ID, return error
        if (orgId == null)
            return Unauthorized(new { message = "Organization context required. Authenticate or provide organizationId in request body." });

        // Return PIN-enabled users for this organization only
        var users = await _context.SystemUsers
            .Where(u => u.OrganizationId == orgId && u.PinHash != null && u.IsEnabled)
            .Select(u => new PinUser
            {
                UserId = u.UserId.ToString(),
                FirstName = u.FirstName,
                LastName = u.LastName,
                Email = u.EmailAddress,
                HasPinEnabled = true
            })
            .ToListAsync();

        return Ok(users);
    }

    [AllowAnonymous]  // PIN login can be called without a current token
    [HttpPost("pin-login")]
    public async Task<ActionResult<AuthResponse>> PinLogin(PinLoginRequest request)
    {
        try
        {
            var response = await _authService.PinLoginAsync(request, request.TerminalId);
            if (response == null)
            {
                return Unauthorized(new { message = "Invalid PIN" });
            }

            // Set refresh token in HttpOnly cookie
            if (!string.IsNullOrEmpty(response.RefreshToken))
            {
                Response.Cookies.Append("refreshToken", response.RefreshToken, new Microsoft.AspNetCore.Http.CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Strict
                    // Session-only cookie - cleared when browser closes
                    // CRITICAL for terminal/kiosk security
                });
                
                response.RefreshToken = null;
            }

            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            // Return 403 Forbidden with error message for invalid/wrong-org terminal
            return StatusCode(403, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Heartbeat endpoint for frontend to ping and reset the idle timeout timer
    /// This should be called periodically (e.g., every 5 minutes) to keep the session alive
    /// The middleware will update the terminal's LastActivityOn timestamp
    /// </summary>
    [HttpPost("heartbeat")]
    [Authorize]
    public IActionResult Heartbeat()
    {
        var idleTimeoutMinutes = _configuration.GetValue<int>("Terminal:IdleTimeoutMinutes", 30);
        return Ok(new
        {
            message = "Heartbeat received",
            timestamp = DateTime.UtcNow,
            idleTimeoutMinutes // Echo back the idle timeout value so frontend knows
        });
    }
}