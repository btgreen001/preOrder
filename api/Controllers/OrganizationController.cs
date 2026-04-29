using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using PreOrderApp.Services;
using PreOrderApp.Models;
namespace PreOrderApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OrganizationController : ControllerBase
    {
        private readonly IOrganizationService _organizationService;
        private readonly PreOrderApp.Data.AppDbContext _context;
        private readonly IOrganizationContextService _orgContext;
        private readonly IEmailService _emailService;

        public OrganizationController(
            IOrganizationService organizationService,
            PreOrderApp.Data.AppDbContext context,
            IOrganizationContextService orgContext,
            IEmailService emailService)
        {
            _organizationService = organizationService;
            _context = context;
            _orgContext = orgContext;
            _emailService = emailService;
        }

        [HttpGet("{id}")]
        [Authorize(Roles = UserRoles.SystemAdmin)]
        public async Task<ActionResult<Organization>> GetById(Guid id)
        {
            try
            {
                var organization = await _organizationService.GetByIdAsync(id);
                return Ok(organization);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        // SYSTEM ADMIN: Get all organizations
        [HttpGet]
        [Route("")]
        [Authorize(Roles = UserRoles.SystemAdmin)]
        public async Task<ActionResult<IEnumerable<Organization>>> GetAllOrganizations()
        {
            var orgs = await _organizationService.GetAllAsync();
            return Ok(orgs);
        }

        // SYSTEM ADMIN: Get all users
        [HttpGet("users")]
        [Authorize(Roles = UserRoles.SystemAdmin)]
        public async Task<ActionResult<IEnumerable<SystemUser>>> GetAllUsers()
        {
            var users = await _context.SystemUsers.ToListAsync();
            return Ok(users);
        }

        // SYSTEM ADMIN: Update organization license tier
        [HttpPut("{id}/license")]
        [Authorize(Roles = UserRoles.SystemAdmin)]
        public async Task<IActionResult> UpdateOrganizationLicense(Guid id, [FromBody] LicenseTier newTier)
        {
            var org = await _context.Organizations.FindAsync(id);
            if (org == null) return NotFound();

            var sub = await _context.LicenseSubscriptions
                .Where(ls => ls.OrganizationId == id && ls.IsActive)
                .OrderByDescending(ls => ls.StartDate)
                .FirstOrDefaultAsync();
            if (sub == null) return NotFound("No active license subscription");

            sub.Tier = newTier;
            sub.ModifiedOn = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // SYSTEM ADMIN: Update user role or enabled status
        [HttpPut("users/{userId}")]
        [Authorize(Roles = UserRoles.SystemAdmin)]
        public async Task<IActionResult> UpdateUser(Guid userId, [FromBody] UpdateUserRequest req)
        {
            var user = await _context.SystemUsers.FindAsync(userId);
            if (user == null) return NotFound();
            if (!string.IsNullOrEmpty(req.UserRole)) user.UserRole = req.UserRole;
            if (req.IsEnabled.HasValue) user.IsEnabled = req.IsEnabled.Value;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // SYSTEM ADMIN: Emulate user (returns an AuthResponse for that user; no JWTs are issued)
        [HttpPost("emulate/{userId}")]
        [Authorize(Roles = UserRoles.SystemAdmin)]
        public async Task<ActionResult<AuthResponse>> EmulateUser(Guid userId)
        {
            var user = await _context.SystemUsers.FindAsync(userId);
            if (user == null) return NotFound();
            var org = await _context.Organizations.FindAsync(user.OrganizationId);
            if (org == null) return NotFound();
            var sub = await _context.LicenseSubscriptions
                .Where(ls => ls.OrganizationId == org.OrganizationId && ls.IsActive)
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
                RegistrationToken = org.RegistrationToken
            };
            return Ok(resp);
        }

        [HttpPost]
        [Authorize(Roles = UserRoles.SystemAdmin)]
        public async Task<ActionResult<Organization>> Create(Organization organization)
        {
            // Generate a random salt for the new organization
            organization.HashSalt = LicenseUtils.GenerateSalt();

            var created = await _organizationService.CreateAsync(organization);
            return CreatedAtAction(nameof(GetById), new { id = created.OrganizationId }, created);
        }

        [AllowAnonymous]
        [HttpGet("validate/{token}")]
        public async Task<ActionResult<bool>> ValidateToken(string token)
        {
            var isValid = await _organizationService.ValidateRegistrationTokenAsync(token);
            return Ok(isValid);
        }

        [HttpPost("{id}/license")]
        [Authorize(Roles = UserRoles.SystemAdmin)]
        public async Task<ActionResult<LicenseSubscription>> CreateLicense(Guid id, [FromBody] LicenseTier tier)
        {
            // Retrieve the organization
            var org = await _context.Organizations.FindAsync(id);
            if (org == null) return NotFound("Organization not found");

            // Generate the identity hash
            var identityHash = LicenseUtils.ComputeIdentityHash(org.OrganizationName, org.PrimaryEmail, org.HashSalt);

            // Create the license
            var license = new LicenseSubscription
            {
                OrganizationId = org.OrganizationId,
                Tier = tier,
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow.AddYears(1),
                IsActive = true,
                CreatedOn = DateTime.UtcNow,
                ModifiedOn = DateTime.UtcNow,
                IdentityHash = identityHash
                // Add other properties as needed
            };

            _context.LicenseSubscriptions.Add(license);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(UpdateOrganizationLicense), new { id = license.SubscriptionId }, license);
        }

        [HttpGet("{id}/license/validate")]
        [Authorize(Roles = UserRoles.SystemAdmin)]
        public async Task<ActionResult<bool>> ValidateLicense(Guid id)
        {
            // Retrieve the organization
            var org = await _context.Organizations.FindAsync(id);
            if (org == null) return NotFound("Organization not found");

            // Retrieve the active license
            var license = await _context.LicenseSubscriptions
                .Where(ls => ls.OrganizationId == id && ls.IsActive)
                .OrderByDescending(ls => ls.StartDate)
                .FirstOrDefaultAsync();
            if (license == null) return NotFound("No active license subscription");

            // Recompute the identity hash
            var expectedHash = LicenseUtils.ComputeIdentityHash(org.OrganizationName, org.PrimaryEmail, org.HashSalt);

            // Compare hashes
            bool isValid = license.IdentityHash == expectedHash;
            return Ok(isValid);
        }

        // COMPANY ADMIN: List invite/registration codes for their org
        [HttpGet("{orgId}/registration-codes")]
        [Authorize(Roles = $"{UserRoles.CompanyAdmin},{UserRoles.SystemAdmin}")]
        public async Task<ActionResult<IEnumerable<RegistrationCodeResponse>>> GetRegistrationCodes(Guid orgId)
        {
            if (!await _orgContext.ValidateUserOrganizationAccessAsync(_orgContext.GetCurrentUserId(), orgId))
                return Forbid();

            var codes = await _context.RegistrationCodes
                .Where(rc => rc.OrganizationId == orgId)
                .OrderByDescending(rc => rc.CreatedOn)
                .Select(rc => new RegistrationCodeResponse
                {
                    CodeId = rc.CodeId,
                    Code = rc.Code,
                    Email = rc.Email,
                    UserRole = rc.UserRole,
                    ExpiresOn = rc.ExpiresOn,
                    IsUsed = rc.IsUsed,
                    UsedOn = rc.UsedOn,
                    CreatedOn = rc.CreatedOn,
                    IsExpired = rc.ExpiresOn < DateTime.UtcNow && !rc.IsUsed
                })
                .ToListAsync();

            return Ok(codes);
        }

        // COMPANY ADMIN: Create a new invite code for their org
        [HttpPost("{orgId}/registration-codes")]
        [Authorize(Roles = $"{UserRoles.CompanyAdmin},{UserRoles.SystemAdmin}")]
        public async Task<ActionResult<RegistrationCodeResponse>> CreateRegistrationCode(Guid orgId, [FromBody] CreateRegistrationCodeRequest request)
        {
            var userId = _orgContext.GetCurrentUserId();
            if (!await _orgContext.ValidateUserOrganizationAccessAsync(userId, orgId))
                return Forbid();

            var org = await _context.Organizations.FindAsync(orgId);
            if (org == null) return NotFound("Organization not found");

            var code = new RegistrationCode
            {
                CodeId = Guid.NewGuid(),
                OrganizationId = orgId,
                Code = Guid.NewGuid().ToString("N").ToUpper()[..12],
                CreatedByUserId = userId,
                Email = request.Email,
                UserRole = UserRoles.User,
                ExpiresOn = DateTime.UtcNow.AddDays(request.ExpiryDays > 0 ? request.ExpiryDays : 7),
                IsUsed = false,
                CreatedOn = DateTime.UtcNow
            };

            _context.RegistrationCodes.Add(code);
            await _context.SaveChangesAsync();

            var emailSent = false;
            if (!string.IsNullOrWhiteSpace(code.Email))
            {
                try
                {
                    await _emailService.SendEmailAsync(code.Email, org.OrganizationName, code.Code, code.ExpiresOn);
                    emailSent = true;
                    await LogInviteAuditAsync("INVITE_CREATE_EMAIL_SENT", userId, orgId, code.CodeId, $"Invite email sent to {code.Email}");
                }
                catch (Exception ex)
                {
                    await LogInviteAuditAsync("INVITE_CREATE_EMAIL_FAILED", userId, orgId, code.CodeId, $"Invite email failed for {code.Email}: {ex.Message}");
                }
            }

            return CreatedAtAction(nameof(GetRegistrationCodes), new { orgId }, new RegistrationCodeResponse
            {
                CodeId = code.CodeId,
                Code = code.Code,
                Email = code.Email,
                UserRole = code.UserRole,
                ExpiresOn = code.ExpiresOn,
                IsUsed = false,
                CreatedOn = code.CreatedOn,
                IsExpired = false,
                EmailSent = emailSent
            });
        }

        [HttpPost("{orgId}/registration-codes/{codeId}/resend")]
        [Authorize(Roles = $"{UserRoles.CompanyAdmin},{UserRoles.SystemAdmin}")]
        public async Task<IActionResult> ResendRegistrationCode(Guid orgId, Guid codeId)
        {
            var userId = _orgContext.GetCurrentUserId();
            if (!await _orgContext.ValidateUserOrganizationAccessAsync(userId, orgId))
                return Forbid();

            var code = await _context.RegistrationCodes
                .FirstOrDefaultAsync(rc => rc.CodeId == codeId && rc.OrganizationId == orgId);

            if (code == null) return NotFound("Registration code not found.");
            if (code.IsUsed) return BadRequest("Cannot resend a code that has already been used.");
            if (code.ExpiresOn < DateTime.UtcNow) return BadRequest("Cannot resend an expired code.");
            if (string.IsNullOrWhiteSpace(code.Email)) return BadRequest("Cannot resend because this code has no invitee email.");

            var oneHourAgo = DateTime.UtcNow.AddHours(-1);
            var resendCount = await _context.AuditLogs
                .Where(a => a.Action == "INVITE_RESEND"
                         && a.EntityType == "RegistrationCode"
                         && a.EntityId == codeId.ToString()
                         && a.Timestamp >= oneHourAgo)
                .CountAsync();

            if (resendCount >= 3)
                return BadRequest("Resend limit reached. Try again later.");

            var org = await _context.Organizations.FindAsync(orgId);
            if (org == null) return NotFound("Organization not found");

            await _emailService.SendEmailAsync(code.Email, org.OrganizationName, code.Code, code.ExpiresOn);
            await LogInviteAuditAsync("INVITE_RESEND", userId, orgId, code.CodeId, $"Invite email resent to {code.Email}");

            return Ok(new { message = "Invite email resent." });
        }

        // COMPANY ADMIN: Delete (revoke) an unused invite code
        [HttpDelete("{orgId}/registration-codes/{codeId}")]
        [Authorize(Roles = $"{UserRoles.CompanyAdmin},{UserRoles.SystemAdmin}")]
        public async Task<IActionResult> DeleteRegistrationCode(Guid orgId, Guid codeId)
        {
            if (!await _orgContext.ValidateUserOrganizationAccessAsync(_orgContext.GetCurrentUserId(), orgId))
                return Forbid();

            var code = await _context.RegistrationCodes
                .FirstOrDefaultAsync(rc => rc.CodeId == codeId && rc.OrganizationId == orgId);

            if (code == null) return NotFound();
            if (code.IsUsed) return BadRequest("Cannot delete a code that has already been used.");

            _context.RegistrationCodes.Remove(code);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private async Task LogInviteAuditAsync(string action, Guid userId, Guid orgId, Guid codeId, string details)
        {
            _context.AuditLogs.Add(new AuditLog
            {
                Action = action,
                UserId = userId,
                OrganizationId = orgId,
                EntityType = "RegistrationCode",
                EntityId = codeId.ToString(),
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = HttpContext.Request.Headers.UserAgent.ToString(),
                Details = details,
                Timestamp = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
        }

    }
    
}

    // DTO for updating user
    public class UpdateUserRequest
    {
        public string? UserRole { get; set; }
        public bool? IsEnabled { get; set; }
    }

    public class CreateRegistrationCodeRequest
    {
        public string? Email { get; set; }
        public int ExpiryDays { get; set; } = 7;
    }

    public class RegistrationCodeResponse
    {
        public Guid CodeId { get; set; }
        public string Code { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string UserRole { get; set; } = string.Empty;
        public DateTime ExpiresOn { get; set; }
        public bool IsUsed { get; set; }
        public DateTime? UsedOn { get; set; }
        public DateTime CreatedOn { get; set; }
        public bool IsExpired { get; set; }
        public bool EmailSent { get; set; }
    }


