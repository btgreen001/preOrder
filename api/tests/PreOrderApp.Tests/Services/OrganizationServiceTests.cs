using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using PreOrderApp.Data;
using PreOrderApp.Models;
using PreOrderApp.Services;
using Xunit;

namespace PreOrderApp.Tests.Services;

public class OrganizationServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _context;
    private readonly OrganizationService _sut;

    public OrganizationServiceTests()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;
        _context = new AppDbContext(options);
        _context.Database.EnsureCreated();
        _sut = new OrganizationService(_context);
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }

    private Organization BuildOrg(string suffix = "")
    {
        return new Organization
        {
            OrganizationId = Guid.NewGuid(),
            OrganizationName = $"Test Bakery{suffix}",
            PrimaryEmail = $"bakery{suffix}@test.com",
            RegistrationToken = Guid.NewGuid().ToString("N"),
            IsEnabled = true,
            CreatedOn = DateTime.UtcNow,
            ModifiedOn = DateTime.UtcNow
        };
    }

    // ── GetByIdAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_ExistingOrg_ReturnsOrg()
    {
        var org = BuildOrg();
        _context.Organizations.Add(org);
        await _context.SaveChangesAsync();

        var result = await _sut.GetByIdAsync(org.OrganizationId);

        Assert.Equal(org.OrganizationId, result.OrganizationId);
        Assert.Equal(org.OrganizationName, result.OrganizationName);
    }

    [Fact]
    public async Task GetByIdAsync_NotFound_ThrowsKeyNotFoundException()
    {
        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            _sut.GetByIdAsync(Guid.NewGuid()));
    }

    // ── CreateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_PersistsOrg_And_CreatesWalkInCustomer_And_Supplier()
    {
        var org = BuildOrg("-new");

        var result = await _sut.CreateAsync(org);

        // Org was saved
        var saved = await _context.Organizations.FindAsync(result.OrganizationId);
        Assert.NotNull(saved);

        // Walk-in customer created
        var walkIn = await _context.Customers
            .FirstOrDefaultAsync(c => c.OrganizationId == result.OrganizationId && c.Name == "Walk-In Customer");
        Assert.NotNull(walkIn);
        Assert.True(walkIn.IsActive);

        // Generic supplier created
        var supplier = await _context.Suppliers
            .FirstOrDefaultAsync(s => s.OrganizationId == result.OrganizationId);
        Assert.NotNull(supplier);
        Assert.Contains("Ad Hoc", supplier.Name);
    }

    [Fact]
    public async Task CreateAsync_SetsCreatedOnAndModifiedOn()
    {
        var org = BuildOrg("-ts");
        var before = DateTime.UtcNow.AddSeconds(-1);

        var result = await _sut.CreateAsync(org);

        Assert.True(result.CreatedOn >= before);
        Assert.True(result.ModifiedOn >= before);
    }

    // ── ValidateRegistrationTokenAsync ────────────────────────────────────────

    [Fact]
    public async Task ValidateRegistrationTokenAsync_ValidToken_ReturnsTrue()
    {
        var org = BuildOrg("-token");
        _context.Organizations.Add(org);
        await _context.SaveChangesAsync();

        var result = await _sut.ValidateRegistrationTokenAsync(org.RegistrationToken);

        Assert.True(result);
    }

    [Fact]
    public async Task ValidateRegistrationTokenAsync_UnknownToken_ReturnsFalse()
    {
        var result = await _sut.ValidateRegistrationTokenAsync("no-such-token");
        Assert.False(result);
    }

    [Fact]
    public async Task ValidateRegistrationTokenAsync_DisabledOrg_ReturnsFalse()
    {
        var org = BuildOrg("-disabled");
        org.IsEnabled = false;
        _context.Organizations.Add(org);
        await _context.SaveChangesAsync();

        var result = await _sut.ValidateRegistrationTokenAsync(org.RegistrationToken);

        Assert.False(result);
    }

    // ── GetAllAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_ReturnsAllOrganizations()
    {
        _context.Organizations.AddRange(BuildOrg("-a"), BuildOrg("-b"));
        await _context.SaveChangesAsync();

        var results = await _sut.GetAllAsync();

        Assert.Equal(2, results.Count());
    }

    [Fact]
    public async Task GetAllAsync_Empty_ReturnsEmptyList()
    {
        var results = await _sut.GetAllAsync();
        Assert.Empty(results);
    }

    // ── UpdateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_ExistingOrg_UpdatesNameAndEmail()
    {
        var org = BuildOrg("-upd");
        _context.Organizations.Add(org);
        await _context.SaveChangesAsync();

        var updated = new Organization
        {
            OrganizationId = org.OrganizationId,
            OrganizationName = "New Name",
            PrimaryEmail = "new@test.com"
        };

        await _sut.UpdateAsync(updated);

        var saved = await _context.Organizations.FindAsync(org.OrganizationId);
        Assert.Equal("New Name", saved!.OrganizationName);
        Assert.Equal("new@test.com", saved.PrimaryEmail);
    }

    [Fact]
    public async Task UpdateAsync_NotFound_ThrowsKeyNotFoundException()
    {
        var ghost = new Organization
        {
            OrganizationId = Guid.NewGuid(),
            OrganizationName = "Ghost",
            PrimaryEmail = "ghost@test.com"
        };

        await Assert.ThrowsAsync<KeyNotFoundException>(() => _sut.UpdateAsync(ghost));
    }
}
