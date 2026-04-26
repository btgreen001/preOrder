using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace PreOrderApp.Middleware
{
    public class RateLimitingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IMemoryCache _cache;
        private readonly int _requestLimit;
        private readonly TimeSpan _timeWindow;

        public RateLimitingMiddleware(RequestDelegate next, IMemoryCache cache, IConfiguration configuration)
        {
            _next = next;
            _cache = cache;

            var configuredLimit = configuration.GetValue<int>("RateLimiting:RefreshToken:RequestLimit", 10);
            var configuredWindowSeconds = configuration.GetValue<int>("RateLimiting:RefreshToken:TimeWindowSeconds", 60);

            _requestLimit = configuredLimit > 0 ? configuredLimit : 10;
            _timeWindow = TimeSpan.FromSeconds(configuredWindowSeconds > 0 ? configuredWindowSeconds : 60);
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Only rate limit refresh token endpoint
            if (!context.Request.Path.StartsWithSegments("/api/auth/refresh-token"))
            {
                await _next(context);
                return;
            }

            var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var cacheKey = $"rate_limit_{ipAddress}";

            var requestCount = _cache.GetOrCreate(cacheKey, entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = _timeWindow;
                return new RateLimitCounter { Count = 0, FirstRequest = DateTime.UtcNow };
            });

            requestCount!.Count++;

            if (requestCount.Count > _requestLimit)
            {
                context.Response.StatusCode = 429; // Too Many Requests
                context.Response.Headers.Append("Retry-After", _timeWindow.TotalSeconds.ToString());
                await context.Response.WriteAsJsonAsync(new
                {
                    error = "Rate limit exceeded",
                    message = $"Too many refresh requests. Please try again in {_timeWindow.TotalSeconds} seconds.",
                    retryAfter = _timeWindow.TotalSeconds
                });
                return;
            }

            _cache.Set(cacheKey, requestCount, _timeWindow);
            await _next(context);
        }

        private class RateLimitCounter
        {
            public int Count { get; set; }
            public DateTime FirstRequest { get; set; }
        }
    }
}
