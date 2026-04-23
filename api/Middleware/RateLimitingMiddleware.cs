using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace OrderMgmt.Middleware
{
    public class RateLimitingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IMemoryCache _cache;
        private readonly int _requestLimit;
        private readonly TimeSpan _timeWindow;

        public RateLimitingMiddleware(RequestDelegate next, IMemoryCache cache, 
                                     int requestLimit = 10, int timeWindowSeconds = 60)
        {
            _next = next;
            _cache = cache;
            _requestLimit = requestLimit;
            _timeWindow = TimeSpan.FromSeconds(timeWindowSeconds);
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
