using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderMgmt.Services;
using OrderMgmt.Models;
using OrderMgmt.Filters;
using Microsoft.Extensions.Logging;
using OrderMgmt.Services.Interfaces;

namespace OrderMgmt.Controllers;

[ApiController]
[Route("api/auth/pin")]
public class PinController : ControllerBase
{
    private readonly IPinService _pinService;
    private readonly IOrganizationContextService _orgContext;
    private readonly ITerminalLockService _terminalLockService;
    private readonly ILogger<PinController> _logger;
    private readonly IAuthService _authService;
    private readonly OrderMgmt.Data.OrderMgmtDbContext _context;

    public PinController(
        IPinService pinService,
        IOrganizationContextService orgContext,
        ITerminalLockService terminalLockService,
        ILogger<PinController> logger,
        IAuthService authService,
        OrderMgmt.Data.OrderMgmtDbContext context)
    {
        _pinService = pinService;
        _orgContext = orgContext;
        _terminalLockService = terminalLockService;
        _logger = logger;
        _authService = authService;
        _context = context;
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

    /// <summary>
    /// Lock a terminal (no authentication required, auto-lock)
    /// </summary>
    [HttpPost("auto-lock-terminal")]
    [AllowAnonymous]
    public async Task<IActionResult> AutoLockTerminal([FromBody] LockTerminalRequest request)
    {
        // Step 1: Get organization (REQUIRED)
        Guid? organizationId = null;
        try
        {
            organizationId = _orgContext.GetCurrentOrganizationId();
        }
        catch
        {
            return Unauthorized(new { message = "Invalid or missing organization context" });
        }

        // Step 2: Get user (OPTIONAL - auto-lock can happen without user)
        Guid? userId = null;
        try
        {
            if (_orgContext.TryGetCurrentUserId(out var uid))
                userId = uid;
        }
        catch { /* ignore, userId stays null */ }

        // Step 3: Validate terminal code
        if (request.TerminalUid == Guid.Empty)
        {
            if (userId.HasValue)
                await _authService.LogoutAllAsync(userId, null, "AUTO_LOCK_TERMINAL_FAILED: missing terminal code");
            return BadRequest(new { message = "Terminal code is required" });
        }

        // Step 4: Get terminal (REQUIRED)
        Terminal? terminal = null;
        try
        {
            terminal = await _terminalLockService.GetTerminalByUidAsync(organizationId.Value, request.TerminalUid);
        }
        catch { }
        if (terminal == null)
        {
            if (userId.HasValue)
                await _authService.LogoutAllAsync(userId, null, $"AUTO_LOCK_TERMINAL_FAILED: terminal not found: {request.TerminalUid}");
            return NotFound(new { message = $"Terminal {request.TerminalUid} not found" });
        }

        // Step 5: Check if already locked
        bool alreadyLocked = await _terminalLockService.IsTerminalLockedAsync(organizationId.Value, terminal.TerminalId);
        if (alreadyLocked)
        {
            return BadRequest(new { message = $"Terminal {request.TerminalUid} is already locked" });
        }

        // Step 6: Logout user if present, then lock terminal
        if (userId.HasValue)
        {
            await _authService.LogoutAllAsync(userId, null, $"AUTO_LOCK_TERMINAL: user logout for terminal {request.TerminalUid}");
        }

        bool lockSuccess = await _terminalLockService.LockTerminalAsync(
            organizationId.Value,
            terminal.TerminalId,
            null);

        if (lockSuccess)
        {
            _logger.LogInformation(
                "Terminal {TerminalCode} auto-locked successfully",
                request.TerminalUid);

            return Ok(new
            {
                success = true,
                message = $"Terminal {request.TerminalUid} auto-locked",
                terminalCode = request.TerminalUid,
                lockedAt = DateTime.UtcNow
            });
        }

        return StatusCode(500, new { message = "Failed to auto-lock terminal" });
    }

    /// <summary>
    /// Set up a new PIN for the authenticated user
    /// </summary>
    [HttpPost("setup")]
    [Authorize]
    [ValidateTenantAccess]
    public async Task<IActionResult> SetupPin([FromBody] PinSetupRequest request)
    {
        if (!_orgContext.TryGetCurrentUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid user token" });
        }

        var result = await _pinService.SetupPinAsync(userId, request.Pin);
        
        if (result.Success)
        {
            return Ok(result);
        }
        
        return BadRequest(result);
    }

    /// <summary>
    /// Validate PIN for quick re-authentication
    /// Supports terminal locking: if terminal is locked and PIN is valid, unlock it
    /// </summary>
    [HttpPost("validate")]
    [AllowAnonymous]
    public async Task<IActionResult> ValidatePin([FromBody] PinValidationRequest request)
    {
        var result = await _pinService.ValidatePinAsync(request.Username, request.Pin);

        if (result.Success && result.User != null)
        {
            // If terminal code provided, check lock status and handle unlocking
            Terminal? terminal = null;
            if (request.TerminalUid != Guid.Empty  && request.TerminalUid.HasValue)
            {
                try
                {
                    terminal = await _terminalLockService.GetTerminalByUidAsync(
                        result.User.OrganizationId, 
                        request.TerminalUid.Value);

                    if (terminal != null)
                    {
                        bool isLocked = await _terminalLockService.IsTerminalLockedAsync(
                            result.User.OrganizationId, 
                            terminal.TerminalId);

                        if (isLocked)
                        {
                            // Terminal is locked - unlock it and log as CHANGE_USER
                            await _terminalLockService.UnlockTerminalAsync(
                                result.User.OrganizationId, 
                                terminal.TerminalId,
                                result.User.UserId);

                            await _terminalLockService.LogActivityAsync(
                                result.User.OrganizationId,
                                terminal.TerminalUid,
                                result.User.UserId,
                                "CHANGE_USER");

                            _logger.LogInformation(
                                "Terminal {TerminalCode} unlocked by user {Username}", 
                                request.TerminalUid, 
                                request.Username);
                        }
                        else
                        {
                            // Terminal not locked - log as LOGIN
                            await _terminalLockService.LogActivityAsync(
                                result.User.OrganizationId,
                                terminal.TerminalUid,
                                result.User.UserId,
                                "LOGIN");

                            _logger.LogInformation(
                                "User {Username} logged in at terminal {TerminalCode}", 
                                request.Username, 
                                request.TerminalUid);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, 
                        "Error processing terminal lock for code {TerminalCode}", 
                        request.TerminalUid);
                    // Don't fail the PIN validation if terminal processing has issues
                }
            }

            // Set refresh token in HttpOnly cookie if available
            if (result.User.RefreshToken != null)
            {
                DeleteRefreshTokenCookie();
                
                Response.Cookies.Append("refreshToken", result.User.RefreshToken, new Microsoft.AspNetCore.Http.CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Strict
                    // Session-only cookie - cleared when browser closes
                    // CRITICAL for terminal/kiosk security
                });
                result.User.RefreshToken = null;
            }

            // Include terminal info in response for frontend localStorage persistence
            var response = new PinValidationResultWithTerminal
            {
                Success = result.Success,
                AccessToken = result.AccessToken,
                User = result.User,
                AttemptsRemaining = result.AttemptsRemaining,
                LockedUntil = result.LockedUntil,
                Message = result.Message,
                Terminal = terminal != null ? new TerminalDto
                {
                    TerminalId = terminal.TerminalId,
                    TerminalCode = terminal.TerminalCode,
                    Location = terminal.Location,
                    TerminalUid = terminal.TerminalUid
                } : null
            };

            return Ok(response);
        }

        if (result.LockedUntil.HasValue)
        {
            return StatusCode(429, result); // Too Many Requests
        }

        return Unauthorized(result);
    }

    /// <summary>
    /// Change existing PIN
    /// </summary>
    [HttpPost("change")]
    [Authorize]
    [ValidateTenantAccess]
    public async Task<IActionResult> ChangePin([FromBody] PinChangeRequest request)
    {
        if (!_orgContext.TryGetCurrentUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid user token" });
        }

        var result = await _pinService.ChangePinAsync(userId, request.CurrentPin, request.NewPin);
        
        if (result.Success)
        {
            return Ok(result);
        }
        
        return BadRequest(result);
    }

    /// <summary>
    /// Reset user PIN (Admin only)
    /// </summary>
    [HttpPost("reset")]
    [Authorize(Roles = UserRoles.CompanyAdmin)]
    [Authorize(Roles = UserRoles.SystemAdmin)]
    public async Task<IActionResult> ResetPin([FromBody] PinResetRequest request)
    {
        var result = await _pinService.ResetPinAsync(request.Username);
        
        if (result.Success)
        {
            return Ok(result);
        }
        
        return NotFound(result);
    }

    /// <summary>
    /// Get PIN status for authenticated user
    /// </summary>
    [HttpGet("status")]
    [Authorize]
    [ValidateTenantAccess]
    public async Task<IActionResult> GetPinStatus()
    {
        if (!_orgContext.TryGetCurrentUserId(out var userId))
        {
            return Unauthorized(new { message = "Invalid user token" });
        }

        var result = await _pinService.GetPinStatusAsync(userId);
        return Ok(result);
    }

    /// <summary>
    /// Get terminal lock status by terminal code
    /// </summary>
    [HttpPost("terminal-status")]
    [Authorize]
    [ValidateTenantAccess]
    public async Task<IActionResult> GetTerminalStatus([FromBody] LockTerminalRequest request)
    {
        if (!_orgContext.TryGetCurrentOrganizationId(out var orgId))
        {
            return Unauthorized(new { message = "Invalid organization context" });
        }

        if (request.TerminalUid == Guid.Empty)
        {
            return BadRequest(new { message = "Terminal code is required" });
        }

        try
        {
            var terminal = await _terminalLockService.GetTerminalByUidAsync(orgId, request.TerminalUid);
            if (terminal == null)
            {
                return NotFound(new { message = $"Terminal {request.TerminalUid} not found" });
            }

            bool isLocked = await _terminalLockService.IsTerminalLockedAsync(orgId, terminal.TerminalId);
            var currentLock = await _terminalLockService.GetCurrentLockAsync(orgId, terminal.TerminalId);

            return Ok(new
            {
                success = true,
                terminalCode = request.TerminalUid,
                terminalId = terminal.TerminalId,
                location = terminal.Location,
                isLocked = isLocked,
                lockedAt = currentLock?.LockedAt,
                lockedByUserId = currentLock?.LockedByUserId,
                lockDurationMinutes = currentLock?.LockedDuration.TotalMinutes,
                isActive = terminal.IsActive
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting terminal status for {TerminalCode}", request.TerminalUid);
            return StatusCode(500, new { message = "Failed to get terminal status" });
        }
    }



    /// <summary>
    /// Lock a terminal (user locks / changes user)
    /// </summary>
    [HttpPost("lock-terminal")]
    [Authorize]
    [ValidateTenantAccess]
    public async Task<IActionResult> LockTerminal([FromBody] LockTerminalRequest request)
    {
        if (request.TerminalUid == Guid.Empty)
        {
            return BadRequest(new { message = "Terminal code is required" });
        }

        try
        {
            // Extract organization context (if available) from header or use default
            // For terminal locking without auth, we need to know the organization
            Guid organizationId;
            try
            {
                organizationId = _orgContext.GetCurrentOrganizationId();
            }
            catch
            {
                return Unauthorized(new { message = "Invalid or missing organization context" });
            }
            Guid userId;
            try
            {
                userId = _orgContext.GetCurrentUserId();
            }
            catch
            {
                return Unauthorized(new { message = "Invalid or missing user context" });
            }
            var terminal = await _terminalLockService.GetTerminalByUidAsync(
                organizationId, 
                request.TerminalUid);

            if (terminal == null)
            {
                return NotFound(new { message = $"Terminal {request.TerminalUid} not found" });
            }

            bool alreadyLocked = await _terminalLockService.IsTerminalLockedAsync(
                organizationId, 
                terminal.TerminalId);

            if (alreadyLocked)
            {
                return BadRequest(new { message = $"Terminal {request.TerminalUid} is already locked" });
            }

            bool lockSuccess = await _terminalLockService.LockTerminalAsync(
                organizationId, 
                terminal.TerminalId,
                userId); 

            if (lockSuccess)
            {
                _logger.LogInformation(
                    "Terminal {TerminalCode} locked by {UserId}", 
                    request.TerminalUid,
                    userId);

                return Ok(new
                {
                    success = true,
                    message = $"Terminal {request.TerminalUid} locked",
                    terminalCode = request.TerminalUid,
                    lockedAt = DateTime.UtcNow
                });
            }

            return StatusCode(500, new { message = "Failed to lock terminal" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error locking terminal {TerminalCode}", request.TerminalUid);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Unlock a terminal (admin only)
    /// </summary>
    [HttpPost("unlock-terminal")]
    [Authorize]
    public async Task<IActionResult> UnlockTerminal([FromBody] UnlockTerminalRequest request)
    {
        if (request.TerminalUid == Guid.Empty)
        {
            return BadRequest(new { message = "Terminal code is required" });
        }

        if (!_orgContext.TryGetCurrentUserId(out var userId) || 
            !_orgContext.TryGetCurrentOrganizationId(out var organizationId))
        {
            return Unauthorized(new { message = "Invalid user or organization context" });
        }

        // Check if user is admin (SystemAdmin or CompanyAdmin role)
        if (!User.IsInRole(UserRoles.SystemAdmin) && !User.IsInRole(UserRoles.CompanyAdmin))
        {
            return Forbid();
        }

        try
        {
            var terminal = await _terminalLockService.GetTerminalByUidAsync(
                organizationId, 
                request.TerminalUid);

            if (terminal == null)
            {
                return NotFound(new { message = $"Terminal {request.TerminalUid} not found" });
            }

            bool isLocked = await _terminalLockService.IsTerminalLockedAsync(
                organizationId, 
                terminal.TerminalId);

            if (!isLocked)
            {
                return BadRequest(new { message = $"Terminal {request.TerminalUid} is not locked" });
            }

            bool unlockSuccess = await _terminalLockService.UnlockTerminalAsync(
                organizationId, 
                terminal.TerminalId,
                userId);

            if (unlockSuccess)
            {
                await _terminalLockService.LogActivityAsync(
                    organizationId,
                    terminal.TerminalUid,
                    userId,
                    "UNLOCK_TERMINAL");

                _logger.LogInformation(
                    "Terminal {TerminalCode} manually unlocked by admin {UserId}", 
                    request.TerminalUid,
                    userId);

                return Ok(new
                {
                    success = true,
                    message = $"Terminal {request.TerminalUid} unlocked",
                    terminalCode = request.TerminalUid,
                    unlockedAt = DateTime.UtcNow
                });
            }

            return StatusCode(500, new { message = "Failed to unlock terminal" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unlocking terminal {TerminalCode}", request.TerminalUid);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Get all currently locked terminals in the organization
    /// </summary>
    [HttpGet("locked-terminals")]
    [Authorize]
    [ValidateTenantAccess]
    public async Task<IActionResult> GetLockedTerminals()
    {
        if (!_orgContext.TryGetCurrentOrganizationId(out var orgId))
        {
            return Unauthorized(new { message = "Invalid organization context" });
        }

        try
        {
            var lockedTerminals = await _terminalLockService.GetLockedTerminalsAsync(orgId);

            return Ok(new
            {
                success = true,
                organizationId = orgId,
                lockedTerminalCount = lockedTerminals.Count(),
                lockedTerminals = lockedTerminals.Select(item => new
                {
                    TerminalUid = item.Terminal.TerminalUid,
                    //terminalId = item.Terminal.TerminalId,
                    terminalCode = item.Terminal.TerminalCode,
                    location = item.Terminal.Location,
                    lockedAt = item.Lock.LockedAt,
                    lockedByUserId = item.Lock.LockedByUserId,
                    lockDurationMinutes = item.Lock.LockedDuration.TotalMinutes,
                    isActive = item.Lock.IsActive
                }).ToList()
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting locked terminals for org {OrgId}", orgId);
            return StatusCode(500, new { message = "Failed to get locked terminals" });
        }
    }
}

// Request models
public class PinSetupRequest
{
    public string Pin { get; set; } = string.Empty;
}

public class PinValidationRequest
{
    public string Username { get; set; } = string.Empty;
    public string Pin { get; set; } = string.Empty;
    public Guid? TerminalUid { get; set; } // Optional: terminal code for lock management
}

public class PinChangeRequest
{
    public string CurrentPin { get; set; } = string.Empty;
    public string NewPin { get; set; } = string.Empty;
}

public class PinResetRequest
{
    public string Username { get; set; } = string.Empty;
}

public class LockTerminalRequest
{
    public Guid TerminalUid { get; set; } = Guid.Empty;
}

public class UnlockTerminalRequest
{
    public Guid TerminalUid { get; set; } = Guid.Empty;
}

// Response models for terminal integration
public class PinValidationResultWithTerminal
{
    public bool Success { get; set; }
    public string? AccessToken { get; set; }
    public AuthResponse? User { get; set; }
    public int? AttemptsRemaining { get; set; }
    public DateTime? LockedUntil { get; set; }
    public string? Message { get; set; }
    public TerminalDto? Terminal { get; set; }
}

public class TerminalDto
{
    public long TerminalId { get; set; }
    public string TerminalCode { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public Guid TerminalUid { get; set; } = Guid.Empty;
}
