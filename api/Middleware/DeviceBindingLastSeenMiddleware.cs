using System.Security.Claims;
using Microsoft.Extensions.Caching.Memory;
using OrderMgmt.Services;

namespace OrderMgmt.Middleware;

/// <summary>
/// Updates terminal device binding LastSeenAt for authenticated API requests.
/// Writes are throttled per device token to avoid hitting the database on every request.
/// </summary>
public class DeviceBindingLastSeenMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IMemoryCache _cache;
    private readonly ILogger<DeviceBindingLastSeenMiddleware> _logger;
    private readonly IConfiguration _configuration;

    public DeviceBindingLastSeenMiddleware(
        RequestDelegate next,
        IMemoryCache cache,
        ILogger<DeviceBindingLastSeenMiddleware> logger,
        IConfiguration configuration)
    {
        _next = next;
        _cache = cache;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task InvokeAsync(HttpContext context, ITerminalDeviceBindingService deviceBindingService)
    {
        await _next(context);

        var path = context.Request.Path.ToString();
        if (!path.StartsWith("/api", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        if (path.StartsWith("/api/auth", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        if (context.Response.StatusCode >= StatusCodes.Status400BadRequest)
        {
            return;
        }

        if (context.User?.Identity?.IsAuthenticated != true)
        {
            return;
        }

        if (!context.Request.Cookies.TryGetValue("device_token", out var tokenRaw)
            || !Guid.TryParse(tokenRaw, out var deviceToken))
        {
            return;
        }

        var orgIdClaim = context.User.FindFirst("org_id")?.Value
            ?? context.User.FindFirst(ClaimTypes.GroupSid)?.Value;

        if (!Guid.TryParse(orgIdClaim, out var organizationId))
        {
            return;
        }

        var updateIntervalSeconds = _configuration.GetValue<int>("Terminal:DeviceLastSeenUpdateSeconds", 60);
        if (updateIntervalSeconds < 10)
        {
            updateIntervalSeconds = 10;
        }

        var cacheKey = $"device-last-seen:{organizationId}:{deviceToken}";
        if (_cache.TryGetValue(cacheKey, out _))
        {
            return;
        }

        try
        {
            await deviceBindingService.UpdateLastSeenAsync(deviceToken, organizationId);
            _cache.Set(cacheKey, true, TimeSpan.FromSeconds(updateIntervalSeconds));
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex,
                "Device last-seen update skipped due to error. Org={OrganizationId}, DeviceToken={DeviceToken}",
                organizationId,
                deviceToken);
        }
    }
}