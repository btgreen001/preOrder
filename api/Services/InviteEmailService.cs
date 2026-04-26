using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace PreOrderApp.Services;

public interface IInviteEmailService
{
    Task SendInviteEmailAsync(string toEmail, string organizationName, string inviteCode, DateTime expiresOnUtc);
}

public class InviteEmailService : IInviteEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<InviteEmailService> _logger;

    public InviteEmailService(IConfiguration configuration, ILogger<InviteEmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendInviteEmailAsync(string toEmail, string organizationName, string inviteCode, DateTime expiresOnUtc)
    {
        var enabled = _configuration.GetValue<bool>("InviteEmails:Enabled", true);
        if (!enabled)
        {
            _logger.LogWarning("Invite email sending is disabled by configuration.");
            return;
        }

        var host = _configuration["InviteEmails:Smtp:Host"] ?? "smtp.gmail.com";
        var port = _configuration.GetValue<int>("InviteEmails:Smtp:Port", 587);
        var username = _configuration["InviteEmails:Smtp:Username"];
        var password = _configuration["InviteEmails:Smtp:Password"];
        var fromEmail = _configuration["InviteEmails:FromEmail"] ?? username ?? "no-reply@example.com";
        var fromName = _configuration["InviteEmails:FromName"] ?? "BakeAhead";
        var registerBaseUrl = _configuration["InviteEmails:RegisterBaseUrl"] ?? "https://localhost:4200/register";

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            _logger.LogError("SMTP credentials not configured. Username: {Username}, Password present: {HasPassword}", 
                username ?? "(empty)", !string.IsNullOrWhiteSpace(password));
            throw new InvalidOperationException("Invite email SMTP credentials are not configured. Please set InviteEmails:Smtp:Username and InviteEmails:Smtp:Password (or SMTP_API_KEY env var).");
        }

        var inviteLink = BuildInviteLink(registerBaseUrl, inviteCode, toEmail);

        using var message = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName),
            Subject = $"Your {organizationName} staff invite",
            Body = BuildHtmlBody(organizationName, inviteCode, expiresOnUtc, inviteLink),
            IsBodyHtml = true
        };

        message.To.Add(toEmail);

        // EnableSsl=true triggers STARTTLS negotiation on port 587 (correct for Gmail App Passwords).
        using var smtpClient = new SmtpClient(host, port)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(username, password),
            DeliveryMethod = SmtpDeliveryMethod.Network,
            UseDefaultCredentials = false,
            Timeout = 10000
        };

        try
        {
            _logger.LogInformation("Sending invite email to {Email} via {Host}:{Port}", toEmail, host, port);
            await smtpClient.SendMailAsync(message);
            _logger.LogInformation("Invite email sent successfully to {Email}", toEmail);
        }
        catch (SmtpException ex)
        {
            _logger.LogError(ex, "SMTP error sending to {Email} on {Host}:{Port}. Status: {StatusCode}", 
                toEmail, host, port, ex.StatusCode);
            throw;
        }
    }

    private static string BuildInviteLink(string registerBaseUrl, string inviteCode, string email)
    {
        var joiner = registerBaseUrl.Contains('?') ? "&" : "?";
        return $"{registerBaseUrl}{joiner}code={Uri.EscapeDataString(inviteCode)}&email={Uri.EscapeDataString(email)}";
    }

private static string BuildHtmlBody(
    string organizationName,
    string inviteCode,
    DateTime expiresOnUtc,
    string inviteLink)
{
    var org = WebUtility.HtmlEncode(organizationName);
    var code = WebUtility.HtmlEncode(inviteCode);
    var linkText = WebUtility.HtmlEncode(inviteLink);
    var safeHref = inviteLink; // leave raw unless you know it contains unsafe chars

    return $@"
<table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""font-family: Arial, sans-serif; font-size: 14px; color: #333;"">
    <tr>
        <td>
            <p>You have been invited to join <strong>{org}</strong> on BakeAhead.</p>

            <p><strong>Invite Code:</strong> {code}</p>

            <p><strong>Expires:</strong> {expiresOnUtc:yyyy-MM-dd HH:mm} UTC</p>

            <p>
                <a href=""{safeHref}"" style=""color: #1a73e8;"">
                    Complete your registration
                </a>
            </p>

            <p>
                If the link does not open, copy this URL into your browser:<br/>
                {linkText}
            </p>
        </td>
    </tr>
</table>";
}

}
