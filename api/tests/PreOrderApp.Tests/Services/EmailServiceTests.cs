using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using PreOrderApp.Services;
using Xunit;

namespace PreOrderApp.Tests.Services;

/// <summary>
/// EmailService tests focus on configuration-level validation paths.
/// The actual SMTP transmission (SendViaMailKitAsync) is not tested here because
/// it requires a live SMTP server; those paths are covered by integration/manual tests.
/// </summary>
public class EmailServiceTests
{
    private static EmailService BuildService(Dictionary<string, string?> configValues)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(configValues)
            .Build();
        var logger = Mock.Of<ILogger<EmailService>>();
        return new EmailService(config, logger);
    }

    private static Dictionary<string, string?> ValidSmtpConfig(bool enabled = true) =>
        new()
        {
            ["Emails:Enabled"] = enabled.ToString(),
            ["Emails:Smtp:Host"] = "smtp.example.com",
            ["Emails:Smtp:Port"] = "587",
            ["Emails:Smtp:Username"] = "user@example.com",
            ["Emails:Smtp:Password"] = "s3cr3t",
            ["Emails:FromEmail"] = "noreply@example.com",
            ["Emails:FromName"] = "BakeAhead",
            ["Emails:RegisterBaseUrl"] = "https://example.com/register",
            ["Emails:AdminEmail"] = "admin@example.com"
        };

    // ── SendEmailAsync (invite) ───────────────────────────────────────────────

    [Fact]
    public async Task SendEmailAsync_MissingUsername_ThrowsInvalidOperation()
    {
        var config = ValidSmtpConfig();
        config["Emails:Smtp:Username"] = null;
        var sut = BuildService(config);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.SendEmailAsync("r@test.com", "Bakery", "CODE123", DateTime.UtcNow.AddDays(1)));
    }

    [Fact]
    public async Task SendEmailAsync_MissingPassword_ThrowsInvalidOperation()
    {
        var config = ValidSmtpConfig();
        config["Emails:Smtp:Password"] = null;
        var sut = BuildService(config);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.SendEmailAsync("r@test.com", "Bakery", "CODE123", DateTime.UtcNow.AddDays(1)));
    }

    [Fact]
    public async Task SendEmailAsync_EmptyPassword_ThrowsInvalidOperation()
    {
        var config = ValidSmtpConfig();
        config["Emails:Smtp:Password"] = "   ";
        var sut = BuildService(config);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.SendEmailAsync("r@test.com", "Bakery", "CODE123", DateTime.UtcNow.AddDays(1)));
    }

    // ── SendPasswordResetCodeEmailAsync ───────────────────────────────────────

    [Fact]
    public async Task SendPasswordResetCodeEmailAsync_MissingCredentials_ThrowsInvalidOperation()
    {
        var config = ValidSmtpConfig();
        config["Emails:Smtp:Username"] = null;
        config["Emails:Smtp:Password"] = null;
        var sut = BuildService(config);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.SendPasswordResetCodeEmailAsync("r@test.com", "Alice", "123456", DateTime.UtcNow.AddMinutes(15)));
    }

    [Fact]
    public async Task SendPasswordResetCodeEmailAsync_MissingPassword_ThrowsInvalidOperation()
    {
        var config = ValidSmtpConfig();
        config["Emails:Smtp:Password"] = null;
        var sut = BuildService(config);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.SendPasswordResetCodeEmailAsync("r@test.com", "Alice", "123456", DateTime.UtcNow.AddMinutes(15)));
    }

    // ── SendUsernameReminderEmailAsync ────────────────────────────────────────

    [Fact]
    public async Task SendUsernameReminderEmailAsync_MissingCredentials_ThrowsInvalidOperation()
    {
        var config = ValidSmtpConfig();
        config["Emails:Smtp:Username"] = null;
        config["Emails:Smtp:Password"] = null;
        var sut = BuildService(config);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.SendUsernameReminderEmailAsync("r@test.com", "Alice", new[] { "alice1" }));
    }

    // ── SendOrderEmailAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task SendOrderEmailAsync_MissingCredentials_ThrowsInvalidOperation()
    {
        var config = ValidSmtpConfig();
        config["Emails:Smtp:Username"] = null;
        config["Emails:Smtp:Password"] = null;
        var sut = BuildService(config);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.SendOrderEmailAsync(
                "customer@test.com",
                "Bakery",
                "contact@bakery.com",
                "Alice",
                "ORD-001",
                Guid.NewGuid().ToString(),
                DateTime.UtcNow.AddDays(1),
                DateTime.UtcNow.AddDays(1).AddHours(1),
                new List<OrderEmailLineItem>
                {
                    new() { Name = "Pumpkin Pie", Quantity = 2, UnitPrice = 12.50m }
                }));
    }

    [Fact]
    public async Task SendOrderEmailAsync_MissingUsername_ThrowsInvalidOperation()
    {
        var config = ValidSmtpConfig();
        config["Emails:Smtp:Username"] = null;
        var sut = BuildService(config);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.SendOrderEmailAsync(
                "customer@test.com",
                "Bakery",
                "contact@bakery.com",
                "Alice",
                "ORD-001",
                Guid.NewGuid().ToString(),
                null,
                null,
                Enumerable.Empty<OrderEmailLineItem>()));
    }
}
