using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using PreOrderApp.Data;
using PreOrderApp.Models;
using PreOrderApp.Services;
using PreOrderApp.Services.Interfaces;
using System.Security.Claims;
using Xunit;

namespace PreOrderApp.Tests.Services;

public class AuthServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _context;
    private readonly Mock<IPasetoTokenService> _mockTokenService;
    private readonly Mock<ITerminalLockService> _mockTerminalLockService;
    private readonly Mock<IEmailService> _mockEmailService;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly Mock<IOrganizationContextService> _mockOrgContextService;
    private readonly AuthService _sut;

    public AuthServiceTests()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;
        _context = new AppDbContext(options);
        _context.Database.EnsureCreated();

        _mockTokenService = new Mock<IPasetoTokenService>();
        _mockTerminalLockService = new Mock<ITerminalLockService>();
        _mockEmailService = new Mock<IEmailService>();
        _mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
        _mockOrgContextService = new Mock<IOrganizationContextService>();

        // Default: no HTTP context
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns((HttpContext?)null);

        // Default: TryGetCurrentOrganizationId returns false (empty) instead of throwing
        _mockOrgContextService
            .Setup(x => x.TryGetCurrentOrganizationId(out It.Ref<Guid>.IsAny))
            .Returns((out Guid id) => { id = Guid.Empty; return false; });

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Paseto:RefreshTokenExpirationDays"] = "30"
            })
            .Build();

        var logger = Mock.Of<ILogger<AuthService>>();
        _sut = new AuthService(config, _context, _mockTokenService.Object, _mockTerminalLockService.Object,
            _mockEmailService.Object, logger, _mockHttpContextAccessor.Object, _mockOrgContextService.Object);
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<(Organization org, SystemUser adminUser, LicenseSubscription sub)> SeedOrgWithAdminAsync(string suffix = "")
    {
        var org = new Organization
        {
            OrganizationId = Guid.NewGuid(),
            OrganizationName = $"Bakery{suffix}",
            PrimaryEmail = $"bakery{suffix}@test.com",
            RegistrationToken = Guid.NewGuid().ToString("N"),
            IsEnabled = true,
            CreatedOn = DateTime.UtcNow,
            ModifiedOn = DateTime.UtcNow
        };
        _context.Organizations.Add(org);

        var admin = new SystemUser
        {
            UserId = Guid.NewGuid(),
            UserName = $"admin{suffix}",
            EmailAddress = $"admin{suffix}@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
            FirstName = "Admin",
            LastName = "User",
            OrganizationId = org.OrganizationId,
            UserRole = UserRoles.CompanyAdmin,
            IsEnabled = true,
            CreatedOn = DateTime.UtcNow
        };
        _context.SystemUsers.Add(admin);

        var sub = new LicenseSubscription
        {
            SubscriptionId = Guid.NewGuid(),
            OrganizationId = org.OrganizationId,
            Tier = LicenseTier.Basic,
            StartDate = DateTime.UtcNow.AddDays(-1),
            EndDate = DateTime.UtcNow.AddYears(1),
            IsActive = true,
            CreatedOn = DateTime.UtcNow,
            ModifiedOn = DateTime.UtcNow
        };
        _context.LicenseSubscriptions.Add(sub);

        await _context.SaveChangesAsync();
        return (org, admin, sub);
    }

    private async Task<RegistrationCode> SeedRegistrationCodeAsync(Organization org, SystemUser createdBy, string email)
    {
        var code = new RegistrationCode
        {
            CodeId = Guid.NewGuid(),
            OrganizationId = org.OrganizationId,
            Code = "TESTCODE123",
            Email = email,
            CreatedByUserId = createdBy.UserId,
            ExpiresOn = DateTime.UtcNow.AddDays(7),
            IsUsed = false,
            CreatedOn = DateTime.UtcNow
        };
        _context.RegistrationCodes.Add(code);
        await _context.SaveChangesAsync();
        return code;
    }

    // ── LoginAsync ────────────────────────────────────────────────────────────

    [Fact]
    public async Task LoginAsync_NullRequest_ReturnsNull()
    {
        var result = await _sut.LoginAsync(null!);
        Assert.Null(result);
    }

    [Fact]
    public async Task LoginAsync_MissingUsername_ReturnsNull()
    {
        var result = await _sut.LoginAsync(new LoginRequest { UserName = "", Password = "pass" });
        Assert.Null(result);
    }

    [Fact]
    public async Task LoginAsync_MissingPassword_ReturnsNull()
    {
        var result = await _sut.LoginAsync(new LoginRequest { UserName = "alice", Password = "" });
        Assert.Null(result);
    }

    [Fact]
    public async Task LoginAsync_UserNotFound_ReturnsNull()
    {
        var result = await _sut.LoginAsync(new LoginRequest { UserName = "nobody", Password = "password123" });
        Assert.Null(result);
    }

    [Fact]
    public async Task LoginAsync_WrongPassword_ReturnsNull()
    {
        var (_, admin, _) = await SeedOrgWithAdminAsync("-wrongpw");
        var result = await _sut.LoginAsync(new LoginRequest { UserName = admin.UserName, Password = "wrongpassword" });
        Assert.Null(result);
    }

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsAuthResponse()
    {
        var (org, admin, _) = await SeedOrgWithAdminAsync("-valid");

        _mockTokenService.Setup(t => t.GenerateAccessToken(It.IsAny<SystemUser>(), It.IsAny<Guid?>(), It.IsAny<Guid?>()))
            .Returns("test-access-token");
        _mockTokenService.Setup(t => t.GenerateRefreshToken())
            .Returns("test-refresh-token");

        var result = await _sut.LoginAsync(new LoginRequest { UserName = admin.UserName, Password = "password123" });

        Assert.NotNull(result);
        Assert.Equal(admin.UserId, result.UserId);
        Assert.Equal(admin.UserName, result.UserName);
        Assert.Equal(org.OrganizationId, result.OrganizationId);
        Assert.Equal("test-access-token", result.AccessToken);
        Assert.Equal("test-refresh-token", result.RefreshToken);
    }

    [Fact]
    public async Task LoginAsync_ValidCredentials_StoresUserSession()
    {
        var (_, admin, _) = await SeedOrgWithAdminAsync("-session");

        _mockTokenService.Setup(t => t.GenerateAccessToken(It.IsAny<SystemUser>(), It.IsAny<Guid?>(), It.IsAny<Guid?>()))
            .Returns("access");
        _mockTokenService.Setup(t => t.GenerateRefreshToken())
            .Returns("refresh-stored");

        await _sut.LoginAsync(new LoginRequest { UserName = admin.UserName, Password = "password123" });

        var session = await _context.UserSessions.FirstOrDefaultAsync(s => s.SessionToken == "refresh-stored");
        Assert.NotNull(session);
        Assert.True(session.IsActive);
        Assert.Equal(admin.UserId, session.UserId);
    }

    // ── IsUserNameAvailableAsync ──────────────────────────────────────────────

    [Fact]
    public async Task IsUserNameAvailableAsync_NotTaken_ReturnsTrue()
    {
        var result = await _sut.IsUserNameAvailableAsync("brandnewuser");
        Assert.True(result);
    }

    [Fact]
    public async Task IsUserNameAvailableAsync_Taken_ReturnsFalse()
    {
        var (_, admin, _) = await SeedOrgWithAdminAsync("-taken");
        var result = await _sut.IsUserNameAvailableAsync(admin.UserName);
        Assert.False(result);
    }

    // ── RevokeRefreshTokenAsync ───────────────────────────────────────────────

    [Fact]
    public async Task RevokeRefreshTokenAsync_ExistingActiveToken_RevokesAndReturnsTrue()
    {
        var (_, admin, _) = await SeedOrgWithAdminAsync("-revoke");
        var session = new UserSession
        {
            SessionId = Guid.NewGuid(),
            UserId = admin.UserId,
            SessionToken = "revokable-token",
            IsActive = true,
            CreatedOn = DateTime.UtcNow,
            LastAccessedOn = DateTime.UtcNow,
            ExpiresOn = DateTime.UtcNow.AddDays(30)
        };
        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();

        var result = await _sut.RevokeRefreshTokenAsync("revokable-token");

        Assert.True(result);
        var updated = await _context.UserSessions.FindAsync(session.SessionId);
        Assert.False(updated!.IsActive);
    }

    [Fact]
    public async Task RevokeRefreshTokenAsync_NotFound_ReturnsFalse()
    {
        var result = await _sut.RevokeRefreshTokenAsync("nonexistent-token");
        Assert.False(result);
    }

    // ── LogoutAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task LogoutAsync_NoHttpContext_ReturnsFalse()
    {
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns((HttpContext?)null);
        var result = await _sut.LogoutAsync();
        Assert.False(result);
    }

    [Fact]
    public async Task LogoutAsync_WithJtiClaim_RevokesSessionAndReturnsTrue()
    {
        var (_, admin, _) = await SeedOrgWithAdminAsync("-logout");
        var sessionId = Guid.NewGuid();
        var session = new UserSession
        {
            SessionId = sessionId,
            UserId = admin.UserId,
            SessionToken = "refresh-for-logout",
            IsActive = true,
            CreatedOn = DateTime.UtcNow,
            LastAccessedOn = DateTime.UtcNow,
            ExpiresOn = DateTime.UtcNow.AddDays(30)
        };
        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();

        var claims = new List<Claim>
        {
            new(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti, sessionId.ToString()),
            new(ClaimTypes.NameIdentifier, admin.UserId.ToString())
        };
        var identity = new ClaimsIdentity(claims, "test");
        var principal = new ClaimsPrincipal(identity);
        var mockHttpContext = new Mock<HttpContext>();
        mockHttpContext.Setup(c => c.User).Returns(principal);
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns(mockHttpContext.Object);

        var result = await _sut.LogoutAsync();

        Assert.True(result);
        var updated = await _context.UserSessions.FindAsync(sessionId);
        Assert.False(updated!.IsActive);
    }

    // ── LogoutAllAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task LogoutAllAsync_ByUserId_RevokesAllActiveSessions()
    {
        var (_, admin, _) = await SeedOrgWithAdminAsync("-logoutall");
        for (int i = 0; i < 3; i++)
        {
            _context.UserSessions.Add(new UserSession
            {
                SessionId = Guid.NewGuid(),
                UserId = admin.UserId,
                SessionToken = $"token-{i}",
                IsActive = true,
                CreatedOn = DateTime.UtcNow,
                LastAccessedOn = DateTime.UtcNow,
                ExpiresOn = DateTime.UtcNow.AddDays(30)
            });
        }
        await _context.SaveChangesAsync();

        var result = await _sut.LogoutAllAsync(userId: admin.UserId);

        Assert.True(result);
        var remaining = await _context.UserSessions.CountAsync(s => s.UserId == admin.UserId && s.IsActive);
        Assert.Equal(0, remaining);
    }

    [Fact]
    public async Task LogoutAllAsync_NoUserIdOrToken_ReturnsFalse()
    {
        var result = await _sut.LogoutAllAsync();
        Assert.False(result);
    }

    // ── RegisterUserAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task RegisterUserAsync_InvalidCode_ThrowsInvalidOperation()
    {
        var request = new RegisterUserRequest
        {
            CompanyRegistrationCode = "BADCODE",
            Email = "new@test.com",
            UserName = "newuser",
            Password = "password123",
            FirstName = "New",
            LastName = "User"
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.RegisterUserAsync(request));
        Assert.Contains("Invalid registration code", ex.Message);
    }

    [Fact]
    public async Task RegisterUserAsync_ExpiredCode_ThrowsInvalidOperation()
    {
        var (org, admin, _) = await SeedOrgWithAdminAsync("-expired");
        var code = new RegistrationCode
        {
            CodeId = Guid.NewGuid(),
            OrganizationId = org.OrganizationId,
            Code = "EXPIREDCODE",
            Email = "newuser@test.com",
            CreatedByUserId = admin.UserId,
            ExpiresOn = DateTime.UtcNow.AddDays(-1), // expired
            IsUsed = false,
            CreatedOn = DateTime.UtcNow.AddDays(-8)
        };
        _context.RegistrationCodes.Add(code);
        await _context.SaveChangesAsync();

        var request = new RegisterUserRequest
        {
            CompanyRegistrationCode = "EXPIREDCODE",
            Email = "newuser@test.com",
            UserName = "newuserexp",
            Password = "password123",
            FirstName = "New",
            LastName = "User"
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.RegisterUserAsync(request));
        Assert.Contains("expired", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RegisterUserAsync_DisabledOrg_ThrowsInvalidOperation()
    {
        var org = new Organization
        {
            OrganizationId = Guid.NewGuid(),
            OrganizationName = "Disabled Org",
            PrimaryEmail = "disabled@test.com",
            RegistrationToken = Guid.NewGuid().ToString("N"),
            IsEnabled = false, // disabled
            CreatedOn = DateTime.UtcNow,
            ModifiedOn = DateTime.UtcNow
        };
        _context.Organizations.Add(org);
        var admin = new SystemUser
        {
            UserId = Guid.NewGuid(),
            UserName = "disabledadmin",
            EmailAddress = "disabledadmin@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("pw"),
            FirstName = "X",
            LastName = "Y",
            OrganizationId = org.OrganizationId,
            UserRole = UserRoles.CompanyAdmin,
            IsEnabled = true,
            CreatedOn = DateTime.UtcNow
        };
        _context.SystemUsers.Add(admin);
        var code = new RegistrationCode
        {
            CodeId = Guid.NewGuid(),
            OrganizationId = org.OrganizationId,
            Code = "DISORGCODE",
            Email = "disableduser@test.com",
            CreatedByUserId = admin.UserId,
            ExpiresOn = DateTime.UtcNow.AddDays(7),
            IsUsed = false,
            CreatedOn = DateTime.UtcNow
        };
        _context.RegistrationCodes.Add(code);
        await _context.SaveChangesAsync();

        var request = new RegisterUserRequest
        {
            CompanyRegistrationCode = "DISORGCODE",
            Email = "disableduser@test.com",
            UserName = "disableduser",
            Password = "password123",
            FirstName = "X",
            LastName = "Y"
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.RegisterUserAsync(request));
        Assert.Contains("disabled", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RegisterUserAsync_DuplicateEmail_ThrowsInvalidOperation()
    {
        var (org, admin, _) = await SeedOrgWithAdminAsync("-dupemail");
        var code = await SeedRegistrationCodeAsync(org, admin, admin.EmailAddress);

        var request = new RegisterUserRequest
        {
            CompanyRegistrationCode = code.Code,
            Email = admin.EmailAddress, // already used
            UserName = "anewusername",
            Password = "password123",
            FirstName = "X",
            LastName = "Y"
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.RegisterUserAsync(request));
        Assert.Contains("Email", ex.Message);
    }

    [Fact]
    public async Task RegisterUserAsync_ValidRequest_CreatesUserAndMarksCodeUsed()
    {
        var (org, admin, sub) = await SeedOrgWithAdminAsync("-register");
        sub.Tier = LicenseTier.Standard;
        await _context.SaveChangesAsync();
        var code = await SeedRegistrationCodeAsync(org, admin, "brandnew@test.com");

        var request = new RegisterUserRequest
        {
            CompanyRegistrationCode = code.Code,
            Email = "brandnew@test.com",
            UserName = "brandnewuser",
            Password = "password123",
            FirstName = "Brand",
            LastName = "New"
        };

        var result = await _sut.RegisterUserAsync(request);

        Assert.NotNull(result);
        Assert.Equal("brandnewuser", result.UserName);
        Assert.Equal(org.OrganizationId, result.OrganizationId);

        var savedUser = await _context.SystemUsers.FirstOrDefaultAsync(u => u.UserName == "brandnewuser");
        Assert.NotNull(savedUser);

        var updatedCode = await _context.RegistrationCodes.FindAsync(code.CodeId);
        Assert.True(updatedCode!.IsUsed);
        Assert.Equal(savedUser.UserId, updatedCode.UsedByUserId);
    }

    // ── RequestPasswordResetCodeAsync ─────────────────────────────────────────

    [Fact]
    public async Task RequestPasswordResetCodeAsync_UnknownEmail_SilentlyReturns()
    {
        // Should not throw, and email service should NOT be called
        await _sut.RequestPasswordResetCodeAsync("nobody@test.com");

        _mockEmailService.Verify(
            e => e.SendPasswordResetCodeEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>()),
            Times.Never);
    }

    [Fact]
    public async Task RequestPasswordResetCodeAsync_ValidEmail_StoresResetCodeAndSendsEmail()
    {
        var (_, admin, _) = await SeedOrgWithAdminAsync("-pwreset");

        _mockEmailService
            .Setup(e => e.SendPasswordResetCodeEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>()))
            .Returns(Task.CompletedTask);

        await _sut.RequestPasswordResetCodeAsync(admin.EmailAddress);

        var updated = await _context.SystemUsers.FindAsync(admin.UserId);
        Assert.NotNull(updated!.PasswordResetCodeHash);
        Assert.NotNull(updated.PasswordResetCodeExpiresOn);
        Assert.True(updated.PasswordResetCodeExpiresOn > DateTime.UtcNow);

        _mockEmailService.Verify(
            e => e.SendPasswordResetCodeEmailAsync(admin.EmailAddress, admin.FirstName, It.IsAny<string>(), It.IsAny<DateTime>()),
            Times.Once);
    }

    // ── ResetPasswordWithCodeAsync ────────────────────────────────────────────

    [Fact]
    public async Task ResetPasswordWithCodeAsync_InvalidCode_Throws()
    {
        var (_, admin, _) = await SeedOrgWithAdminAsync("-resetbad");

        // Set a valid hash
        var goodCode = "654321";
        admin.PasswordResetCodeHash = BCrypt.Net.BCrypt.HashPassword(goodCode);
        admin.PasswordResetCodeExpiresOn = DateTime.UtcNow.AddMinutes(10);
        await _context.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.ResetPasswordWithCodeAsync(admin.EmailAddress, "000000", "newpassword123"));
        Assert.Contains("Invalid or expired reset code", ex.Message);
    }

    [Fact]
    public async Task ResetPasswordWithCodeAsync_ExpiredCode_Throws()
    {
        var (_, admin, _) = await SeedOrgWithAdminAsync("-resetexp");
        var goodCode = "654321";
        admin.PasswordResetCodeHash = BCrypt.Net.BCrypt.HashPassword(goodCode);
        admin.PasswordResetCodeExpiresOn = DateTime.UtcNow.AddMinutes(-5); // expired
        await _context.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.ResetPasswordWithCodeAsync(admin.EmailAddress, goodCode, "newpassword123"));
        Assert.Contains("Invalid or expired reset code", ex.Message);
    }

    [Fact]
    public async Task ResetPasswordWithCodeAsync_ValidCode_UpdatesPasswordAndRevokesTokens()
    {
        var (_, admin, _) = await SeedOrgWithAdminAsync("-resetok");
        var goodCode = "123456";
        admin.PasswordResetCodeHash = BCrypt.Net.BCrypt.HashPassword(goodCode);
        admin.PasswordResetCodeExpiresOn = DateTime.UtcNow.AddMinutes(10);
        await _context.SaveChangesAsync();

        // Add an active session that should be revoked
        _context.UserSessions.Add(new UserSession
        {
            SessionId = Guid.NewGuid(),
            UserId = admin.UserId,
            SessionToken = "old-session",
            IsActive = true,
            CreatedOn = DateTime.UtcNow,
            LastAccessedOn = DateTime.UtcNow,
            ExpiresOn = DateTime.UtcNow.AddDays(30)
        });
        await _context.SaveChangesAsync();

        await _sut.ResetPasswordWithCodeAsync(admin.EmailAddress, goodCode, "newpassword123");

        var updated = await _context.SystemUsers.FindAsync(admin.UserId);
        Assert.Null(updated!.PasswordResetCodeHash);
        Assert.Null(updated.PasswordResetCodeExpiresOn);
        Assert.True(BCrypt.Net.BCrypt.Verify("newpassword123", updated.PasswordHash));

        var sessions = await _context.UserSessions.CountAsync(s => s.UserId == admin.UserId && s.IsActive);
        Assert.Equal(0, sessions);
    }

    [Fact]
    public async Task ResetPasswordWithCodeAsync_ShortPassword_Throws()
    {
        var (_, admin, _) = await SeedOrgWithAdminAsync("-shortpw");
        var goodCode = "123456";
        admin.PasswordResetCodeHash = BCrypt.Net.BCrypt.HashPassword(goodCode);
        admin.PasswordResetCodeExpiresOn = DateTime.UtcNow.AddMinutes(10);
        await _context.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.ResetPasswordWithCodeAsync(admin.EmailAddress, goodCode, "short"));
        Assert.Contains("8 characters", ex.Message);
    }

    // ── RegisterCompanyAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task RegisterCompanyAsync_DuplicateEmail_ThrowsInvalidOperation()
    {
        var (org, _, _) = await SeedOrgWithAdminAsync("-co");

        var request = new RegisterCompanyRequest
        {
            CompanyName = "New Bakery",
            Email = org.PrimaryEmail, // already exists
            AdminEmail = "uniqueadmin@new.com",
            AdminUserName = "newadmin",
            AdminPassword = "password123",
            AdminFirstName = "A",
            AdminLastName = "B",
            Locality = "City",
            Region = "ST",
            PostalCode = "12345",
            CountryCode = "US",
            LicenseTier = LicenseTier.Basic
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.RegisterCompanyAsync(request));
        Assert.Contains("Company email is already in use", ex.Message);
    }

    [Fact]
    public async Task RegisterCompanyAsync_ValidRequest_CreatesOrgAdminAndSubscription()
    {
        var request = new RegisterCompanyRequest
        {
            CompanyName = "Fresh Bakery",
            Email = "fresh@bakery.com",
            AdminEmail = "freshAdmin@bakery.com",
            AdminUserName = "freshadmin",
            AdminPassword = "password123",
            AdminFirstName = "Fresh",
            AdminLastName = "Admin",
            Locality = "Anytown",
            Region = "CA",
            PostalCode = "90210",
            CountryCode = "US",
            LicenseTier = LicenseTier.Basic
        };

        var result = await _sut.RegisterCompanyAsync(request);

        Assert.NotEqual(Guid.Empty, result.OrganizationId);
        Assert.Equal("Fresh Bakery", result.CompanyName);
        Assert.NotNull(result.AdminAuth);

        var org = await _context.Organizations.FindAsync(result.OrganizationId);
        Assert.NotNull(org);
        Assert.True(org!.IsEnabled);

        var sub = await _context.LicenseSubscriptions.FirstOrDefaultAsync(s => s.OrganizationId == result.OrganizationId);
        Assert.NotNull(sub);
        Assert.True(sub!.IsActive);
    }
}
