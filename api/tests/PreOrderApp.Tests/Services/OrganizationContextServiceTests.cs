using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using PreOrderApp.Data;
using PreOrderApp.Models;
using PreOrderApp.Services;
using Xunit;

namespace PreOrderApp.Tests.Services;

public class OrganizationContextServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _context;

    public OrganizationContextServiceTests()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;
        _context = new AppDbContext(options);
        _context.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }

    private static OrganizationContextService BuildService(
        IHttpContextAccessor accessor,
        AppDbContext? context = null)
    {
        var logger = Mock.Of<ILogger<OrganizationContextService>>();
        return new OrganizationContextService(accessor, context!, logger);
    }

    private static IHttpContextAccessor BuildAccessorWithClaims(params Claim[] claims)
    {
        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);
        var httpContext = new DefaultHttpContext { User = principal };
        var accessor = new Mock<IHttpContextAccessor>();
        accessor.Setup(a => a.HttpContext).Returns(httpContext);
        return accessor.Object;
    }

    private static IHttpContextAccessor BuildNullAccessor()
    {
        var accessor = new Mock<IHttpContextAccessor>();
        accessor.Setup(a => a.HttpContext).Returns((HttpContext?)null);
        return accessor.Object;
    }

    // ── GetCurrentOrganizationId ──────────────────────────────────────────────

    [Fact]
    public void GetCurrentOrganizationId_NullHttpContext_ThrowsInvalidOperation()
    {
        var sut = BuildService(BuildNullAccessor(), _context);
        Assert.Throws<InvalidOperationException>(() => sut.GetCurrentOrganizationId());
    }

    [Fact]
    public void GetCurrentOrganizationId_ValidOrgIdClaim_ReturnsId()
    {
        var orgId = Guid.NewGuid();
        var sut = BuildService(BuildAccessorWithClaims(new Claim("org_id", orgId.ToString())), _context);

        var result = sut.GetCurrentOrganizationId();

        Assert.Equal(orgId, result);
    }

    [Fact]
    public void GetCurrentOrganizationId_MissingClaim_Throws()
    {
        var sut = BuildService(BuildAccessorWithClaims(), _context);
        Assert.Throws<InvalidOperationException>(() => sut.GetCurrentOrganizationId());
    }

    // ── TryGetCurrentOrganizationId ───────────────────────────────────────────

    [Fact]
    public void TryGetCurrentOrganizationId_NullHttpContext_ReturnsFalse()
    {
        var sut = BuildService(BuildNullAccessor(), _context);
        var result = sut.TryGetCurrentOrganizationId(out var id);
        Assert.False(result);
        Assert.Equal(Guid.Empty, id);
    }

    [Fact]
    public void TryGetCurrentOrganizationId_ValidClaim_ReturnsTrueWithId()
    {
        var orgId = Guid.NewGuid();
        var sut = BuildService(BuildAccessorWithClaims(new Claim("org_id", orgId.ToString())), _context);

        var result = sut.TryGetCurrentOrganizationId(out var id);

        Assert.True(result);
        Assert.Equal(orgId, id);
    }

    [Fact]
    public void TryGetCurrentOrganizationId_MissingClaim_ReturnsFalse()
    {
        var sut = BuildService(BuildAccessorWithClaims(), _context);
        var result = sut.TryGetCurrentOrganizationId(out var id);
        Assert.False(result);
        Assert.Equal(Guid.Empty, id);
    }

    [Fact]
    public void TryGetCurrentOrganizationId_InvalidGuidValue_ReturnsFalse()
    {
        var sut = BuildService(BuildAccessorWithClaims(new Claim("org_id", "not-a-guid")), _context);
        var result = sut.TryGetCurrentOrganizationId(out var id);
        Assert.False(result);
        Assert.Equal(Guid.Empty, id);
    }

    // ── GetCurrentUserId ──────────────────────────────────────────────────────

    [Fact]
    public void GetCurrentUserId_ValidSubClaim_ReturnsId()
    {
        var userId = Guid.NewGuid();
        var sut = BuildService(
            BuildAccessorWithClaims(new Claim(ClaimTypes.NameIdentifier, userId.ToString())),
            _context);

        var result = sut.GetCurrentUserId();

        Assert.Equal(userId, result);
    }

    [Fact]
    public void GetCurrentUserId_MissingClaim_Throws()
    {
        var sut = BuildService(BuildAccessorWithClaims(), _context);
        Assert.Throws<InvalidOperationException>(() => sut.GetCurrentUserId());
    }

    // ── TryGetCurrentUserId ───────────────────────────────────────────────────

    [Fact]
    public void TryGetCurrentUserId_ValidClaim_ReturnsTrueWithId()
    {
        var userId = Guid.NewGuid();
        var sut = BuildService(
            BuildAccessorWithClaims(new Claim(ClaimTypes.NameIdentifier, userId.ToString())),
            _context);

        var result = sut.TryGetCurrentUserId(out var id);

        Assert.True(result);
        Assert.Equal(userId, id);
    }

    [Fact]
    public void TryGetCurrentUserId_MissingClaim_ReturnsFalse()
    {
        var sut = BuildService(BuildAccessorWithClaims(), _context);
        var result = sut.TryGetCurrentUserId(out var id);
        Assert.False(result);
        Assert.Equal(Guid.Empty, id);
    }

    [Fact]
    public void TryGetCurrentUserId_InvalidGuid_ReturnsFalse()
    {
        var sut = BuildService(
            BuildAccessorWithClaims(new Claim(ClaimTypes.NameIdentifier, "bad-guid")),
            _context);

        var result = sut.TryGetCurrentUserId(out var id);
        Assert.False(result);
    }

    // ── ValidateUserOrganizationAccessAsync ───────────────────────────────────

    [Fact]
    public async Task ValidateUserOrganizationAccessAsync_UserNotFound_ReturnsFalse()
    {
        var sut = BuildService(BuildAccessorWithClaims(), _context);
        var result = await sut.ValidateUserOrganizationAccessAsync(Guid.NewGuid(), Guid.NewGuid());
        Assert.False(result);
    }

    [Fact]
    public async Task ValidateUserOrganizationAccessAsync_UserMatchesOrg_ReturnsTrue()
    {
        var orgId = Guid.NewGuid();
        var org = new Organization
        {
            OrganizationId = orgId,
            OrganizationName = "Test Org",
            PrimaryEmail = "org@test.com",
            RegistrationToken = Guid.NewGuid().ToString(),
            IsEnabled = true,
            CreatedOn = DateTime.UtcNow,
            ModifiedOn = DateTime.UtcNow
        };
        _context.Organizations.Add(org);

        var user = new SystemUser
        {
            UserId = Guid.NewGuid(),
            UserName = "testuser",
            EmailAddress = "u@test.com",
            PasswordHash = "hash",
            OrganizationId = orgId,
            UserRole = UserRoles.User,
            IsEnabled = true,
            CreatedOn = DateTime.UtcNow
        };
        _context.SystemUsers.Add(user);
        await _context.SaveChangesAsync();

        var sut = BuildService(BuildAccessorWithClaims(), _context);
        var result = await sut.ValidateUserOrganizationAccessAsync(user.UserId, orgId);

        Assert.True(result);
    }

    [Fact]
    public async Task ValidateUserOrganizationAccessAsync_UserWrongOrg_ReturnsFalse()
    {
        var orgId = Guid.NewGuid();
        var org = new Organization
        {
            OrganizationId = orgId,
            OrganizationName = "Test Org",
            PrimaryEmail = "org2@test.com",
            RegistrationToken = Guid.NewGuid().ToString(),
            IsEnabled = true,
            CreatedOn = DateTime.UtcNow,
            ModifiedOn = DateTime.UtcNow
        };
        _context.Organizations.Add(org);

        var user = new SystemUser
        {
            UserId = Guid.NewGuid(),
            UserName = "wrongorguser",
            EmailAddress = "wrong@test.com",
            PasswordHash = "hash",
            OrganizationId = orgId,
            UserRole = UserRoles.User,
            IsEnabled = true,
            CreatedOn = DateTime.UtcNow
        };
        _context.SystemUsers.Add(user);
        await _context.SaveChangesAsync();

        var sut = BuildService(BuildAccessorWithClaims(), _context);
        var result = await sut.ValidateUserOrganizationAccessAsync(user.UserId, Guid.NewGuid());

        Assert.False(result);
    }

    [Fact]
    public async Task ValidateUserOrganizationAccessAsync_SystemAdmin_AlwaysReturnsTrue()
    {
        var orgId = Guid.NewGuid();
        var org = new Organization
        {
            OrganizationId = orgId,
            OrganizationName = "Admin Org",
            PrimaryEmail = "admin-org@test.com",
            RegistrationToken = Guid.NewGuid().ToString(),
            IsEnabled = true,
            CreatedOn = DateTime.UtcNow,
            ModifiedOn = DateTime.UtcNow
        };
        _context.Organizations.Add(org);

        var admin = new SystemUser
        {
            UserId = Guid.NewGuid(),
            UserName = "sysadmin",
            EmailAddress = "sysadmin@test.com",
            PasswordHash = "hash",
            OrganizationId = orgId,
            UserRole = UserRoles.SystemAdmin,
            IsEnabled = true,
            CreatedOn = DateTime.UtcNow
        };
        _context.SystemUsers.Add(admin);
        await _context.SaveChangesAsync();

        var sut = BuildService(BuildAccessorWithClaims(), _context);
        var result = await sut.ValidateUserOrganizationAccessAsync(admin.UserId, Guid.NewGuid());

        Assert.True(result);
    }
}
