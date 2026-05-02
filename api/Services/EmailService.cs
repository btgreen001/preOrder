using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace PreOrderApp.Services;

public class OrderEmailLineItem
{
    public string Name { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

public interface IEmailService
{
    Task SendEmailAsync(string toEmail, string organizationName, string inviteCode, DateTime expiresOnUtc);
    Task SendPasswordResetCodeEmailAsync(string toEmail, string firstName, string code, DateTime expiresOnUtc);
    Task SendOrderEmailAsync(
        string toEmail,
        string organizationName,
        string organizationContactEmail,
        string customerName,
        string orderId,
        DateTime? pickupSlotStartAt,
        DateTime? pickupSlotEndAt,
        IEnumerable<OrderEmailLineItem> lines,
        string? pickupAddress = null,
        string? pickupCity = null,
        string? pickupState = null,
        string? contactPhone = null,
        string? contactEmail = null);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendEmailAsync(string toEmail, string organizationName, string inviteCode, DateTime expiresOnUtc)
    {
        var enabled = _configuration.GetValue<bool>("Emails:Enabled", true);
        if (!enabled)
        {
            _logger.LogWarning("Email sending is disabled by configuration.");
            toEmail = _configuration["Emails:AdminEmail"] ?? "";
        }

        var host = _configuration["Emails:Smtp:Host"] ?? "smtp.gmail.com";
        var port = _configuration.GetValue<int>("Emails:Smtp:Port", 587);
        var username = _configuration["Emails:Smtp:Username"];
        var password = _configuration["Emails:Smtp:Password"];
        var fromEmail = _configuration["Emails:FromEmail"] ?? username ?? "no-reply@example.com";
        var fromName = _configuration["Emails:FromName"] ?? "BakeAhead";
        var registerBaseUrl = _configuration["Emails:RegisterBaseUrl"] ?? "https://localhost:4200/register";

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            _logger.LogError("SMTP credentials not configured. Username: {Username}, Password present: {HasPassword}", 
                username ?? "(empty)", !string.IsNullOrWhiteSpace(password));
            throw new InvalidOperationException("Invite email SMTP credentials are not configured. Please set Emails:Smtp:Username and Emails:Smtp:Password (or SMTP_API_KEY env var).");
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

    public async Task SendPasswordResetCodeEmailAsync(string toEmail, string firstName, string code, DateTime expiresOnUtc)
    {
        var enabled = _configuration.GetValue<bool>("Emails:Enabled", true);
        if (!enabled)
        {
            _logger.LogWarning("Email sending is disabled by configuration.");
            toEmail = _configuration["Emails:AdminEmail"] ?? "";
        }

        var host = _configuration["Emails:Smtp:Host"] ?? "smtp.gmail.com";
        var port = _configuration.GetValue<int>("Emails:Smtp:Port", 587);
        var username = _configuration["Emails:Smtp:Username"];
        var password = _configuration["Emails:Smtp:Password"];
        var fromEmail = _configuration["Emails:FromEmail"] ?? username ?? "no-reply@example.com";
        var fromName = _configuration["Emails:FromName"] ?? "BakeAhead";

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            _logger.LogError("SMTP credentials not configured. Username: {Username}, Password present: {HasPassword}",
                username ?? "(empty)", !string.IsNullOrWhiteSpace(password));
            throw new InvalidOperationException("Password reset SMTP credentials are not configured. Please set Emails:Smtp:Username and Emails:Smtp:Password (or SMTP_API_KEY env var).");
        }

        using var message = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName),
            Subject = "Your BakeAhead password reset code",
            Body = BuildPasswordResetHtmlBody(firstName, code, expiresOnUtc),
            IsBodyHtml = true
        };

        message.To.Add(toEmail);

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
            _logger.LogInformation("Sending password reset code email to {Email} via {Host}:{Port}", toEmail, host, port);
            await smtpClient.SendMailAsync(message);
            _logger.LogInformation("Password reset code email sent successfully to {Email}", toEmail);
        }
        catch (SmtpException ex)
        {
            _logger.LogError(ex, "SMTP error sending password reset code to {Email} on {Host}:{Port}. Status: {StatusCode}",
                toEmail, host, port, ex.StatusCode);
            throw;
        }
    }

    public async Task SendOrderEmailAsync(
        string toEmail,
        string organizationName,
        string organizationContactEmail,
        string customerName,
        string orderId,
        DateTime? pickupSlotStartAt,
        DateTime? pickupSlotEndAt,
        IEnumerable<OrderEmailLineItem> lines,
        string? pickupAddress = null,
        string? pickupCity = null,
        string? pickupState = null,
        string? contactPhone = null,
        string? contactEmail = null)
    {
        var enabled = _configuration.GetValue<bool>("Emails:Enabled", true);
        if (!enabled)
        {
            _logger.LogWarning("Email sending is disabled by configuration.");
            toEmail = _configuration["Emails:AdminEmail"] ?? "";
        }

        var host = _configuration["Emails:Smtp:Host"] ?? "smtp.gmail.com";
        var port = _configuration.GetValue<int>("Emails:Smtp:Port", 587);
        var username = _configuration["Emails:Smtp:Username"];
        var password = _configuration["Emails:Smtp:Password"];
        var fromEmail = organizationContactEmail
            ?? _configuration["Emails:FromEmail"]
            ?? username
            ?? "no-reply@example.com";
        var fromName = _configuration["Emails:FromName"] ?? "BakeAhead";
        var orderBaseUrl = _configuration["Emails:OrderBaseUrl"] ?? "https://localhost:4200/preorders/external";

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            _logger.LogError("SMTP credentials not configured. Username: {Username}, Password present: {HasPassword}", 
                username ?? "(empty)", !string.IsNullOrWhiteSpace(password));
            throw new InvalidOperationException("Order email SMTP credentials are not configured. Please set Emails:Smtp:Username and Emails:Smtp:Password (or SMTP_API_KEY env var).");
        }
        var orderLink = BuildOrderLink(orderBaseUrl, orderId);
        var normalizedLines = (lines ?? Enumerable.Empty<OrderEmailLineItem>())
            .Where(line => line.Quantity > 0)
            .Select(line => new OrderEmailLineItem
            {
                Name = line.Name,
                Quantity = line.Quantity,
                UnitPrice = line.UnitPrice
            })
            .ToList();

        using var message = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName),
            Subject = $"Your {organizationName} order confirmation",
            Body = BuildOrderHtmlBody(
                organizationName,
                customerName,
                orderId,
                pickupSlotStartAt,
                pickupSlotEndAt,
                orderLink,
                normalizedLines,
                pickupAddress,
                pickupCity,
                pickupState,
                contactPhone,
                contactEmail),
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
            _logger.LogInformation("Sending order email to {Email} via {Host}:{Port}", toEmail, host, port);
            await smtpClient.SendMailAsync(message);
            _logger.LogInformation("Order email sent successfully to {Email}", toEmail);
        }
        catch (SmtpException ex)
        {
            _logger.LogError(ex, "SMTP error sending to {Email} on {Host}:{Port}. Status: {StatusCode}", 
                toEmail, host, port, ex.StatusCode);
            throw;
        }
    }

    private static string BuildOrderLink(string orderBaseUrl, string orderId)
    {
        var joiner = orderBaseUrl.Contains('?') ? "&" : "?";
        return $"{orderBaseUrl}{joiner}externalId={Uri.EscapeDataString(orderId)}";
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
            <p>You have been invited to join <strong>{org}</strong> on BakeAhead™.</p>

            <p><strong>Invite Code:</strong> {code}</p>

            <p><strong>Expires:</strong> {expiresOnUtc:yyyy-MM-dd HH:mm} (UTC)</p>

            <p>
                <a href=""{safeHref}"" style=""color: #1a73e8;"">
                    Complete your registration
                </a>
            </p>

            <p>
                If the link does not open, copy this URL into your browser:<br/>
                {linkText}
            </p>
            <p>
                If you did not expect this invitation, you can ignore this email. The invite code will expire on its own.
            </p>
            <p> 
            © 2000-{DateTime.UtcNow.Year} G&S Blue Collar. All rights reserved. BakeSweet℠ and all related marks are trademarks of G&S Blue Collar.
            </p>
        </td>
    </tr>
</table>";
}

private static string BuildOrderHtmlBody(
    string organizationName,
    string customerName,
    string orderId,
    DateTime? pickupSlotStartAt,
    DateTime? pickupSlotEndAt,
    string orderLink,
    IReadOnlyCollection<OrderEmailLineItem> lines,
    string? pickupAddress = null,
    string? pickupCity = null,
    string? pickupState = null,
    string? contactPhone = null,
    string? contactEmail = null)
{
    var org = WebUtility.HtmlEncode(organizationName);
    var safeCustomerName = WebUtility.HtmlEncode(customerName);
    var safeOrderId = WebUtility.HtmlEncode(orderId);
    var linkText = WebUtility.HtmlEncode(orderLink);
    var safeHref = orderLink;
    var pickupWindowText = pickupSlotStartAt.HasValue && pickupSlotEndAt.HasValue
        ? $"{pickupSlotStartAt.Value:dddd, MMMM d yyyy h:mm tt} to {pickupSlotEndAt.Value:h:mm tt} (merchant's local time)"
        : "Pickup window unavailable";

    // Build pickup location block
    var locationParts = new List<string>();
    if (!string.IsNullOrWhiteSpace(pickupAddress)) locationParts.Add(WebUtility.HtmlEncode(pickupAddress));
    var cityState = string.Join(", ", new[] { pickupCity, pickupState }.Where(s => !string.IsNullOrWhiteSpace(s)).Select(WebUtility.HtmlEncode!));
    if (!string.IsNullOrWhiteSpace(cityState)) locationParts.Add(cityState);
    var locationHtml = locationParts.Count > 0
        ? $"<p><strong>Pickup Location:</strong><br/>{string.Join("<br/>", locationParts)}</p>"
        : string.Empty;

    // Build contact block
    var contactLines = new List<string>();
    if (!string.IsNullOrWhiteSpace(contactPhone))
        contactLines.Add($"Phone: {WebUtility.HtmlEncode(contactPhone)}");
    if (!string.IsNullOrWhiteSpace(contactEmail))
        contactLines.Add($"Email: <a href=\"mailto:{WebUtility.HtmlEncode(contactEmail)}\" style=\"color: #1a73e8;\">{WebUtility.HtmlEncode(contactEmail)}</a>");
    var contactHtml = contactLines.Count > 0
        ? $"<p><strong>Contact:</strong><br/>{string.Join("<br/>", contactLines)}</p>"
        : string.Empty;

    var lineRows = string.Join(string.Empty, lines.Select(line =>
    {
        var safeName = WebUtility.HtmlEncode(line.Name);
        var quantity = line.Quantity;
        var unitPrice = line.UnitPrice;
        var lineTotal = unitPrice * quantity;
        return $@"<tr>
                    <td style=""padding: 6px 8px; border-bottom: 1px solid #ececec;"">{safeName}</td>
                    <td style=""padding: 6px 8px; border-bottom: 1px solid #ececec; text-align: right;"">{quantity}</td>
                    <td style=""padding: 6px 8px; border-bottom: 1px solid #ececec; text-align: right;"">{unitPrice:C}</td>
                    <td style=""padding: 6px 8px; border-bottom: 1px solid #ececec; text-align: right;"">{lineTotal:C}</td>
                </tr>";
    }));

    if (string.IsNullOrWhiteSpace(lineRows))
    {
        lineRows = "<tr><td colspan=\"4\" style=\"padding: 6px 8px; color: #666;\">No line details were available.</td></tr>";
    }

    var subtotal = lines.Sum(line => line.UnitPrice * line.Quantity);

    return $@"
<table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""font-family: Arial, sans-serif; font-size: 14px; color: #333;"">
    <tr>
        <td>
            <p>Hi {safeCustomerName},</p>

            <p>Thank you for your order with <strong>{org}</strong> on BakeAhead.</p>

            <p><strong>Order ID:</strong> {safeOrderId}</p>

            <p><strong>Pickup Window:</strong> {WebUtility.HtmlEncode(pickupWindowText)}</p>
            <p>Orders not picked up during this scheduled window may become unavailable. Please contact the merchant if you have any questions about pickup.</p>
            {locationHtml}

            {contactHtml}

            <p><strong>Order summary:</strong></p>
            <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""border-collapse: collapse; margin: 8px 0 12px 0;"">
                <thead>
                    <tr>
                        <th style=""padding: 6px 8px; border-bottom: 2px solid #ddd; text-align: left;"">Item</th>
                        <th style=""padding: 6px 8px; border-bottom: 2px solid #ddd; text-align: right;"">Qty</th>
                        <th style=""padding: 6px 8px; border-bottom: 2px solid #ddd; text-align: right;"">Unit</th>
                        <th style=""padding: 6px 8px; border-bottom: 2px solid #ddd; text-align: right;"">Line Total</th>
                    </tr>
                </thead>
                <tbody>
                    {lineRows}
                </tbody>
            </table>

            <p><strong>Subtotal:</strong> {subtotal:C}</p>

            <p>
                <a href=""{safeHref}"" style=""color: #1a73e8;"">
                    View your order
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

private static string BuildPasswordResetHtmlBody(string firstName, string code, DateTime expiresOnUtc)
{
    var safeFirstName = WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(firstName) ? "there" : firstName);
    var safeCode = WebUtility.HtmlEncode(code);

    return $@"
<table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""font-family: Arial, sans-serif; font-size: 14px; color: #333;"">
    <tr>
        <td>
            <p>Hi {safeFirstName},</p>
            <p>Use this one-time code to reset your BakeAhead password:</p>
            <p style=""font-size: 22px; font-weight: 700; letter-spacing: 2px; margin: 16px 0;"">{safeCode}</p>
            <p>This code expires at <strong>{expiresOnUtc:yyyy-MM-dd HH:mm} UTC</strong>.</p>
            <p>If you did not request a password reset, you can ignore this email.</p>
        </td>
    </tr>
</table>";
}

}
