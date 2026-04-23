using OrderMgmt.Data;
using OrderMgmt.Models;
using Microsoft.EntityFrameworkCore;

namespace OrderMgmt.Services;

public class OrganizationService : IOrganizationService
{
    private readonly OrderMgmtDbContext _context;

    public OrganizationService(OrderMgmtDbContext context)
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
        var walkInCustomer = new Customer
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

    public async Task<bool> ValidateRegistrationTokenAsync(string token)
    {
        return await _context.Organizations
            .AnyAsync(o => o.RegistrationToken == token && o.IsEnabled);
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