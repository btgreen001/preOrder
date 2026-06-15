using Stripe;
using PreOrderApp.Data;
using PreOrderApp.Models;
using Microsoft.EntityFrameworkCore;

namespace PreOrderApp.Services;

public class OrganizationService : IOrganizationService
{
    private readonly AppDbContext _context;

    public OrganizationService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Organization> GetByIdAsync(Guid id)
    {
        return await _context.Organizations
            .Include(o => o.Orders)
            .FirstOrDefaultAsync(o => o.OrganizationId == id)
            ?? throw new KeyNotFoundException("Organization not found");
    }

    public async Task<Organization> CreateAsync(Organization organization)
    {
        organization.CreatedOn = DateTime.UtcNow;
        organization.ModifiedOn = DateTime.UtcNow;
        
        await _context.Organizations.AddAsync(organization);
        await _context.SaveChangesAsync();
        
        // Create walk-in customer for this organization
        var walkInCustomer = new PreOrderApp.Models.Customer
        {
            ExternalId = Guid.NewGuid(),
            OrganizationId = organization.OrganizationId,
            Name = "Walk-In Customer",
            Email = null,
            Phone = null,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            VersionNbr = 1
        };
        
        await _context.Customers.AddAsync(walkInCustomer);
        
        // Create generic ad hoc supplier for items without a formal supplier/batch
        var genericSupplier = new Supplier
        {
            ExternalId = Guid.NewGuid(),
            OrganizationId = organization.OrganizationId,
            Name = "Ad Hoc / Unbatched Items",
            Email = null,
            Phone = null,
            Address = null,
            City = null,
            State = null,
            ZipCode = null,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            VersionNbr = 1
        };
        
        await _context.Suppliers.AddAsync(genericSupplier);
        await _context.SaveChangesAsync();
        
        return organization;
    }



    public async Task<StripeOnboardingResponse> StartOnboardingAsync(Guid organizationId)
    {
        // Create a connected account under YOUR platform
        var accountService = new AccountService();
        var account = await accountService.CreateAsync(new AccountCreateOptions
        {
            Type = "express"
        });

        // Save the connected account ID
        var stripeAccount = new StripeAccount
        {
            ExternalId = Guid.NewGuid(),
            AccountId = account.Id,
            OrganizationId = organizationId,
            OnboardingStatusCd = "pending",
            IsEnabled = false,
            CreatedOn = DateTime.UtcNow
        };

        _context.StripeAccounts.Add(stripeAccount);
        await _context.SaveChangesAsync();

        // Generate onboarding link
        var linkService = new AccountLinkService();
        var link = await linkService.CreateAsync(new AccountLinkCreateOptions
        {
            Account = account.Id,
            RefreshUrl = "https://yourapp.com/stripe/refresh",
            ReturnUrl = "https://yourapp.com/stripe/complete",
            Type = "account_onboarding"
        });

        return new StripeOnboardingResponse
        {
            AccountId = account.Id,
            OnboardingUrl = link.Url
        };
    }

    public async Task<object> CheckOnboardingStatusAsync(Guid organizationId, string accountId)
    {
        // var accountService = new AccountService();
        // var account = await accountService.GetAsync(accountId);

        // return new
        // {
        //     accountId,
        //     isCompleted = account.DetailsSubmitted
        // };
        return await Task.FromResult<object>(true);
    }

    public async Task<bool> ValidateRegistrationTokenAsync(string token)
    {
        return await _context.Organizations
            .AnyAsync(o => o.RegistrationToken == token && o.IsEnabled);
    }

    public async Task<bool> IsRegistrationInviteEmailAvailableAsync(Guid organizationId, string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return true;
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var utcNow = DateTime.UtcNow;

        var hasOutstandingInvite = await _context.RegistrationCodes
            .AsNoTracking()
            .AnyAsync(rc => rc.OrganizationId == organizationId
                && !rc.IsUsed
                && rc.ExpiresOn >= utcNow
                && rc.Email != null
                && rc.Email.ToLower() == normalizedEmail);

        if (hasOutstandingInvite)
        {
            return false;
        }

        var hasExistingUser = await _context.SystemUsers
            .AsNoTracking()
            .AnyAsync(u => u.OrganizationId == organizationId
                && u.EmailAddress.ToLower() == normalizedEmail);

        return !hasExistingUser;
    }

    public async Task<IEnumerable<Organization>> GetAllAsync()
    {
        return await _context.Organizations
            .Include(o => o.Orders)
            .ToListAsync();
    }

    public async Task UpdateAsync(Organization organization)
    {
        var organizationId = organization.OrganizationId;

        var org = await _context.Organizations.FindAsync(organizationId);
        if (org == null) throw new KeyNotFoundException("Organization not found");
        
        // Only update specified properties
        org.OrganizationName = organization.OrganizationName;
        org.PrimaryEmail = organization.PrimaryEmail;
        org.ModifiedOn = DateTime.UtcNow;
        
        // EF Core change tracking handles update
        await _context.SaveChangesAsync();
    }
}