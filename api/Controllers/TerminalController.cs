namespace OrderMgmt.Controllers;

using OrderMgmt.DTOs;
using OrderMgmt.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

[ApiController]
[Route("api/terminal")]
[Authorize]
public class TerminalController : ControllerBase
{
    private readonly ITerminalService _terminalService;
    private readonly ITerminalDeviceBindingService _deviceBindingService;
    private readonly IOrganizationContextService _orgContext;
    private readonly ILogger<TerminalController> _logger;

    public TerminalController(
        ITerminalService terminalService,
        ITerminalDeviceBindingService deviceBindingService,
        IOrganizationContextService orgContext,
        ILogger<TerminalController> logger)
    {
        _terminalService = terminalService;
        _deviceBindingService = deviceBindingService;
        _orgContext = orgContext;
        _logger = logger;
    }

    /// <summary>
    /// Get all active terminals for the organization
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        try
        {
            var organizationIdClaim = User.FindFirst("org_id");
            if (organizationIdClaim == null)
            {
                _logger.LogWarning("[TerminalController.GetAll] Organization ID claim not found in token");
                return Forbid();
            }

            if (!Guid.TryParse(organizationIdClaim.Value, out var organizationId))
            {
                _logger.LogWarning("[TerminalController.GetAll] Invalid organization ID in claim: {OrgId}", organizationIdClaim.Value);
                return BadRequest(new { message = "Invalid organization ID in token" });
            }

            var terminals = await _terminalService.GetAllAsync(organizationId);
            return Ok(terminals);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TerminalController.GetAll] Error retrieving terminals");
            return StatusCode(500, new { message = "Error retrieving terminals" });
        }
    }

    /// <summary>
    /// Get all active terminals for the organization
    /// </summary>
    [HttpGet("active")]
    public async Task<IActionResult> GetActive()
    {
        try
        {
            var organizationIdClaim = User.FindFirst("org_id");
            if (organizationIdClaim == null)
            {
                _logger.LogWarning("[TerminalController.GetActive] Organization ID claim not found in token");
                return Forbid();
            }

            if (!Guid.TryParse(organizationIdClaim.Value, out var organizationId))
            {
                _logger.LogWarning("[TerminalController.GetActive] Invalid organization ID in claim: {OrgId}", organizationIdClaim.Value);
                return BadRequest(new { message = "Invalid organization ID in token" });
            }

            var terminals = await _terminalService.GetActiveAsync(organizationId);
            return Ok(terminals);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TerminalController.GetActive] Error retrieving active terminals");
            return StatusCode(500, new { message = "Error retrieving active terminals" });
        }
    }


    /// <summary>
    /// Get all available (active and not bound) terminals for the organization
    /// </summary>
    [HttpGet("available")]
    public async Task<IActionResult> GetAvailable()
    {
        try
        {
            var organizationIdClaim = User.FindFirst("org_id");
            if (organizationIdClaim == null)
            {
                _logger.LogWarning("[TerminalController.GetAvailable] Organization ID claim not found in token");
                return Forbid();
            }

            if (!Guid.TryParse(organizationIdClaim.Value, out var organizationId))
            {
                _logger.LogWarning("[TerminalController.GetAvailable] Invalid organization ID in claim: {OrgId}", organizationIdClaim.Value);
                return BadRequest(new { message = "Invalid organization ID in token" });
            }

            Guid? deviceToken = null;
            if (Request.Cookies.TryGetValue("device_token", out var deviceTokenStr)
                && Guid.TryParse(deviceTokenStr, out var parsedToken))
            {
                deviceToken = parsedToken;
            }

            var terminals = await _terminalService.GetAvailableAsync(organizationId, deviceToken);
            return Ok(terminals);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TerminalController.GetAvailable] Error retrieving available terminals");
            return StatusCode(500, new { message = "Error retrieving available terminals" });
        }
    }

    /// <summary>
    /// Get the terminal currently bound to this device token (if any)
    /// </summary>
    [HttpGet("current-binding")]
    public async Task<IActionResult> GetCurrentBinding()
    {
        try
        {
            var organizationIdClaim = User.FindFirst("org_id");
            if (organizationIdClaim == null)
            {
                _logger.LogWarning("[TerminalController.GetCurrentBinding] Organization ID claim not found in token");
                return Forbid();
            }

            if (!Guid.TryParse(organizationIdClaim.Value, out var organizationId))
            {
                _logger.LogWarning("[TerminalController.GetCurrentBinding] Invalid organization ID in claim: {OrgId}", organizationIdClaim.Value);
                return BadRequest(new { message = "Invalid organization ID in token" });
            }

            if (!Request.Cookies.TryGetValue("device_token", out var deviceTokenStr)
                || !Guid.TryParse(deviceTokenStr, out var deviceToken))
            {
                return Ok(null);
            }

            var terminal = await _deviceBindingService.GetCurrentBoundTerminalAsync(deviceToken, organizationId);
            return Ok(terminal);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TerminalController.GetCurrentBinding] Error retrieving current terminal binding");
            return StatusCode(500, new { message = "Error retrieving current terminal binding" });
        }
    }

    /// <summary>
    /// Returns terminal + org context from the device_token cookie alone — no auth required.
    /// Used by the frontend to rehydrate TerminalContextService after a hard page reload.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("device-context")]
    public async Task<IActionResult> GetDeviceContext()
    {
        try
        {
            if (!Request.Cookies.TryGetValue("device_token", out var deviceTokenStr)
                || !Guid.TryParse(deviceTokenStr, out var deviceToken))
            {
                return Ok(null);
            }

            var context = await _deviceBindingService.GetDeviceContextAsync(deviceToken);
            return Ok(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TerminalController.GetDeviceContext] Error retrieving device context");
            return StatusCode(500, new { message = "Error retrieving device context" });
        }
    }

    /// <summary>
    /// Releases the active device binding for this device_token — no auth required.
    /// Called on explicit logout so that device-context returns null on next reload,
    /// ensuring the app routes to /login rather than /pin-signin.
    /// </summary>
    [AllowAnonymous]
    [HttpDelete("device-context")]
    public async Task<IActionResult> ReleaseDeviceContext()
    {
        try
        {
            if (!Request.Cookies.TryGetValue("device_token", out var deviceTokenStr)
                || !Guid.TryParse(deviceTokenStr, out var deviceToken))
            {
                return Ok(new { released = false });
            }

            var released = await _deviceBindingService.ReleaseDeviceContextAsync(deviceToken);
            return Ok(new { released });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TerminalController.ReleaseDeviceContext] Error releasing device context");
            return StatusCode(500, new { message = "Error releasing device context" });
        }
    }

    /// <summary>
    /// Get a specific terminal by its UUID
    /// </summary>
    [HttpGet("{terminalUid:guid}")]
    public async Task<IActionResult> GetByUid(Guid terminalUid)
    {
        try
        {
            var organizationIdClaim = User.FindFirst("org_id");
            if (organizationIdClaim == null)
            {
                _logger.LogWarning("[TerminalController.GetByUid] Organization ID claim not found in token");
                return Forbid();
            }

            if (!Guid.TryParse(organizationIdClaim.Value, out var organizationId))
            {
                _logger.LogWarning("[TerminalController.GetByUid] Invalid organization ID in claim: {OrgId}", organizationIdClaim.Value);
                return BadRequest(new { message = "Invalid organization ID in token" });
            }

            var terminal = await _terminalService.GetByUidAsync(terminalUid, organizationId);
            if (terminal == null)
            {
                _logger.LogWarning("[TerminalController.GetByUid] Terminal {TerminalUid} not found for org {OrgId}", terminalUid, organizationId);
                return NotFound(new { message = "Terminal not found" });
            }

            return Ok(terminal);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TerminalController.GetByUid] Error retrieving terminal {TerminalUid}", terminalUid);
            return StatusCode(500, new { message = "Error retrieving terminal" });
        }
    }

    /// <summary>
    /// Create a new terminal for the organization
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTerminalRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.TerminalCode))
                return BadRequest(new { message = "TerminalCode is required" });

            if (string.IsNullOrWhiteSpace(request.Location))
                return BadRequest(new { message = "Location is required" });

            var organizationIdClaim = User.FindFirst("org_id");
            if (organizationIdClaim == null)
            {
                _logger.LogWarning("[TerminalController.Create] Organization ID claim not found in token");
                return Forbid();
            }

            if (!Guid.TryParse(organizationIdClaim.Value, out var organizationId))
            {
                _logger.LogWarning("[TerminalController.Create] Invalid organization ID in claim: {OrgId}", organizationIdClaim.Value);
                return BadRequest(new { message = "Invalid organization ID in token" });
            }

            var terminal = await _terminalService.CreateAsync(request, organizationId);
            _logger.LogInformation("[TerminalController.Create] Created terminal {TerminalUid} for org {OrgId}", terminal.TerminalUid, organizationId);

            return CreatedAtAction(nameof(GetByUid), new { terminalUid = terminal.TerminalUid }, terminal);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("[TerminalController.Create] Validation error: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TerminalController.Create] Error creating terminal");
            return StatusCode(500, new { message = "Error creating terminal" });
        }
    }

    /// <summary>
    /// Update a terminal by its UUID
    /// </summary>
    [HttpPut("{terminalUid:guid}")]
    public async Task<IActionResult> Update(Guid terminalUid, [FromBody] UpdateTerminalRequest request)
    {
        try
        {
            var organizationIdClaim = User.FindFirst("org_id");
            if (organizationIdClaim == null)
            {
                _logger.LogWarning("[TerminalController.Update] Organization ID claim not found in token");
                return Forbid();
            }

            if (!Guid.TryParse(organizationIdClaim.Value, out var organizationId))
            {
                _logger.LogWarning("[TerminalController.Update] Invalid organization ID in claim: {OrgId}", organizationIdClaim.Value);
                return BadRequest(new { message = "Invalid organization ID in token" });
            }

            var updated = await _terminalService.UpdateAsync(terminalUid, request, organizationId);
            if (!updated)
            {
                _logger.LogWarning("[TerminalController.Update] Terminal {TerminalUid} not found for org {OrgId}", terminalUid, organizationId);
                return NotFound(new { message = "Terminal not found" });
            }

            _logger.LogInformation("[TerminalController.Update] Updated terminal {TerminalUid} for org {OrgId}", terminalUid, organizationId);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TerminalController.Update] Error updating terminal {TerminalUid}", terminalUid);
            return StatusCode(500, new { message = "Error updating terminal" });
        }
    }

    /// <summary>
    /// Deactivate (soft delete) a terminal by its UUID
    /// </summary>
    [HttpDelete("{terminalUid:guid}")]
    public async Task<IActionResult> Deactivate(Guid terminalUid)
    {
        try
        {
            var organizationIdClaim = User.FindFirst("org_id");
            if (organizationIdClaim == null)
            {
                _logger.LogWarning("[TerminalController.Deactivate] Organization ID claim not found in token");
                return Forbid();
            }

            if (!Guid.TryParse(organizationIdClaim.Value, out var organizationId))
            {
                _logger.LogWarning("[TerminalController.Deactivate] Invalid organization ID in claim: {OrgId}", organizationIdClaim.Value);
                return BadRequest(new { message = "Invalid organization ID in token" });
            }

            var (found, wasDeactivated) = await _terminalService.DeactivateAsync(terminalUid, organizationId);
            if (!found)
            {
                _logger.LogWarning("[TerminalController.Deactivate] Terminal {TerminalUid} not found for org {OrgId}", terminalUid, organizationId);
                return NotFound(new { message = "Terminal not found" });
            }

            if (wasDeactivated)
            {
                _logger.LogInformation("[TerminalController.Deactivate] Deactivated terminal {TerminalUid} for org {OrgId}", terminalUid, organizationId);
            }
            else
            {
                _logger.LogInformation("[TerminalController.Deactivate] Terminal {TerminalUid} was already deactivated for org {OrgId}", terminalUid, organizationId);
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TerminalController.Deactivate] Error deactivating terminal {TerminalUid}", terminalUid);
            return StatusCode(500, new { message = "Error deactivating terminal" });
        }
    }

    /// <summary>
    /// Reactivate a deactivated terminal by its UUID
    /// </summary>
    [HttpPost("{terminalUid:guid}/reactivate")]
    public async Task<IActionResult> Reactivate(Guid terminalUid)
    {
        try
        {
            var organizationIdClaim = User.FindFirst("org_id");
            if (organizationIdClaim == null)
            {
                _logger.LogWarning("[TerminalController.Reactivate] Organization ID claim not found in token");
                return Forbid();
            }

            if (!Guid.TryParse(organizationIdClaim.Value, out var organizationId))
            {
                _logger.LogWarning("[TerminalController.Reactivate] Invalid organization ID in claim: {OrgId}", organizationIdClaim.Value);
                return BadRequest(new { message = "Invalid organization ID in token" });
            }

            var (found, wasReactivated) = await _terminalService.ReactivateAsync(terminalUid, organizationId);
            if (!found)
            {
                _logger.LogWarning("[TerminalController.Reactivate] Terminal {TerminalUid} not found for org {OrgId}", terminalUid, organizationId);
                return NotFound(new { message = "Terminal not found" });
            }

            if (wasReactivated)
            {
                _logger.LogInformation("[TerminalController.Reactivate] Reactivated terminal {TerminalUid} for org {OrgId}", terminalUid, organizationId);
            }
            else
            {
                _logger.LogInformation("[TerminalController.Reactivate] Terminal {TerminalUid} was already active for org {OrgId}", terminalUid, organizationId);
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TerminalController.Reactivate] Error reactivating terminal {TerminalUid}", terminalUid);
            return StatusCode(500, new { message = "Error reactivating terminal" });
        }
    }
    // ===== DEVICE BINDING ENDPOINTS =====

    /// <summary>
    /// Bind device to terminal (new or existing device)
    /// Sets HttpOnly cookie with device token
    /// </summary>
    [HttpPost("bind-device")]
    public async Task<IActionResult> BindDevice([FromBody] BindDeviceRequest request)
    {
        try
        {
            var organizationId = _orgContext.GetCurrentOrganizationId();
            var userId = _orgContext.GetCurrentUserId();

            // Get device token from cookie if exists, fall back to request body (Insomnia / non-browser clients)
            Guid? deviceToken = null;
            if (Request.Cookies.TryGetValue("device_token", out var deviceTokenStr) 
                && Guid.TryParse(deviceTokenStr, out var parsedToken))
            {
                deviceToken = parsedToken;
            }
            else if (!string.IsNullOrEmpty(request.DeviceToken)
                && Guid.TryParse(request.DeviceToken, out var bodyToken))
            {
                deviceToken = bodyToken;
            }

            var response = await _deviceBindingService.BindDeviceAsync(
                request.TerminalUid,
                deviceToken,
                userId,
                organizationId);

            // Set HttpOnly cookie with device token
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = true, // HTTPS only
                SameSite = SameSiteMode.Strict,
                Expires = DateTimeOffset.UtcNow.AddDays(365) // 1 year
            };
            Response.Cookies.Append("device_token", response.DeviceToken.ToString(), cookieOptions);

            _logger.LogInformation("Device bound: {DeviceToken} to terminal {TerminalUid}", 
                response.DeviceToken, request.TerminalUid);

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Device binding failed: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error binding device to terminal {TerminalUid}", request.TerminalUid);
            return StatusCode(500, new { message = "Error binding device" });
        }
    }

    /// <summary>
    /// Unbind device from terminal (explicit logout/unbind)
    /// Clears HttpOnly cookie
    /// </summary>
    [HttpPost("unbind-device")]
    public async Task<IActionResult> UnbindDevice([FromBody] UnbindDeviceRequest request)
    {
        try
        {
            var organizationId = _orgContext.GetCurrentOrganizationId();
            var userId = _orgContext.GetCurrentUserId();

            // Get device token from cookie
            if (!Request.Cookies.TryGetValue("device_token", out var deviceTokenStr)
                || !Guid.TryParse(deviceTokenStr, out var deviceToken))
            {
                return BadRequest(new { message = "No valid device token found" });
            }

            var success = await _deviceBindingService.UnbindDeviceAsync(
                request.TerminalUid,
                deviceToken,
                userId,
                organizationId);

            if (!success)
            {
                return NotFound(new { message = "Device binding not found" });
            }

            // Clear cookie
            Response.Cookies.Delete("device_token");

            _logger.LogInformation("Device unbound: {DeviceToken} from terminal {TerminalUid}",
                deviceToken, request.TerminalUid);

            return Ok(new { message = "Device unbound successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unbinding device from terminal {TerminalUid}", request.TerminalUid);
            return StatusCode(500, new { message = "Error unbinding device" });
        }
    }

    /// <summary>
    /// Check if current device is bound to specific terminal
    /// </summary>
    [HttpPost("check-binding")]
    public async Task<IActionResult> CheckBinding([FromBody] CheckBindingRequest request)
    {
        try
        {
            var organizationId = _orgContext.GetCurrentOrganizationId();

            // Get device token from cookie
            Guid? deviceToken = null;
            if (Request.Cookies.TryGetValue("device_token", out var deviceTokenStr)
                && Guid.TryParse(deviceTokenStr, out var parsedToken))
            {
                deviceToken = parsedToken;
            }

            var response = await _deviceBindingService.CheckBindingAsync(
                request.TerminalUid,
                deviceToken,
                organizationId);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking device binding for terminal {TerminalUid}", request.TerminalUid);
            return StatusCode(500, new { message = "Error checking binding" });
        }
    }

    /// <summary>
    /// Admin: Get all active bindings for a terminal
    /// </summary>
    [HttpGet("bindings/{terminalUid:guid}")]
    [Authorize(Roles = "admin,CompanyAdmin")]
    public async Task<IActionResult> GetActiveBindings(Guid terminalUid)
    {
        try
        {
            var organizationIdClaim = User.FindFirst("org_id");
            if (organizationIdClaim == null)
            {
                return Forbid();
            }

            if (!Guid.TryParse(organizationIdClaim.Value, out var organizationId))
            {
                return BadRequest(new { message = "Invalid organization ID" });
            }

            var bindings = await _deviceBindingService.GetActiveBindingsForTerminalAsync(
                terminalUid,
                organizationId);

            return Ok(bindings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving bindings for terminal {TerminalUid}", terminalUid);
            return StatusCode(500, new { message = "Error retrieving bindings" });
        }
    }

    /// <summary>
    /// Admin: Force release a device binding
    /// </summary>
    [HttpDelete("bindings/{bindingId}")]
   [Authorize(Roles = "admin,CompanyAdmin")]
    public async Task<IActionResult> AdminReleaseBinding(long bindingId)
    {
        try
        {
            var organizationId = _orgContext.GetCurrentOrganizationId();
            var userId = _orgContext.GetCurrentUserId();

            var success = await _deviceBindingService.AdminReleaseDeviceAsync(
                bindingId,
                userId,
                organizationId);

            if (!success)
            {
                return NotFound(new { message = "Binding not found" });
            }

            _logger.LogInformation("Admin {UserId} released device binding {BindingId}", userId, bindingId);

            return Ok(new { message = "Device binding released successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error releasing device binding {BindingId}", bindingId);
            return StatusCode(500, new { message = "Error releasing binding" });
        }
    }
}