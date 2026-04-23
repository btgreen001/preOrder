using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PreOrderApp.DTOs;
using PreOrderApp.Services;
using PreOrderApp.Filters;
namespace PreOrderApp.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[ValidateTenantAccess]

public class PinAdminController : ControllerBase
{
    private readonly IPinAdminService _adminService;
    private readonly ILogger<PinAdminController> _logger;
private readonly IOrganizationContextService _orgContext;
    public PinAdminController(IPinAdminService adminService, ILogger<PinAdminController> logger, IOrganizationContextService orgContext)
    {
        _adminService = adminService;
        _logger = logger;
        _orgContext = orgContext;
    }

    [HttpGet("users")]
    public async Task<ActionResult<List<PinUserDto>>> GetAllPinUsers()
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var users = await _adminService.GetAllPinUsersAsync(orgId);
            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting PIN users");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("users/{userId:guid}")]
    public async Task<ActionResult<PinUserDto>> GetPinUser(Guid userId)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var user = await _adminService.GetPinUserByIdAsync(userId, orgId);
            return Ok(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting PIN user");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("users")]
    public async Task<ActionResult<PinUserDto>> CreatePinUser([FromBody] CreatePinUserRequest request)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var performedBy = _orgContext.GetCurrentUserId().ToString();
            
            var user = await _adminService.CreatePinUserAsync(request, orgId, performedBy);
            return CreatedAtAction(nameof(GetPinUser), new { userId = user.UserId }, user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating PIN user");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPut("users/{userId:guid}")]
    public async Task<ActionResult<PinUserDto>> UpdatePinUser(Guid userId, [FromBody] UpdatePinUserRequest request)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var performedBy = _orgContext.GetCurrentUserId().ToString();
            
            var user = await _adminService.UpdatePinUserAsync(userId, request, orgId, performedBy);
            return Ok(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating PIN user");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("users/{userId:guid}/reset-pin")]
    public async Task<ActionResult> ResetPin(Guid userId)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var performedBy = _orgContext.GetCurrentUserId().ToString();
            
            await _adminService.ResetPinAsync(userId, orgId, performedBy);
            return Ok(new { message = "PIN reset successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting PIN");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("users/{userId:guid}/unlock")]
    public async Task<ActionResult> UnlockUser(Guid userId)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var performedBy = _orgContext.GetCurrentUserId().ToString();
            
            await _adminService.UnlockUserAsync(userId, orgId, performedBy);
            return Ok(new { message = "User unlocked successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unlocking user");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("audit-logs")]
    public async Task<ActionResult<List<AdminAuditLogDto>>> GetAuditLogs([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        try
        {
            var orgId = _orgContext.GetCurrentOrganizationId();
            var logs = await _adminService.GetAuditLogsAsync(orgId, startDate, endDate);
            return Ok(logs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting audit logs");
            return StatusCode(500, new { error = ex.Message });
        }
    }

}
