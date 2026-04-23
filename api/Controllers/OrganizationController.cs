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

        public OrganizationController(IOrganizationService organizationService, PreOrderApp.Data.AppDbContext context)
        {
            _organizationService = organizationService;
            _context = context;
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

    }
    
}

    // DTO for updating user
    public class UpdateUserRequest
    {
        public string? UserRole { get; set; }
        public bool? IsEnabled { get; set; }
    }
