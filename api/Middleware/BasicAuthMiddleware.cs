using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using PreOrderApp.Data;
using System;
using System.Net;
using System.Text;
using System.Threading.Tasks;

namespace PreOrderApp.Middleware
{
    public class BasicAuthMiddleware
    {
        private readonly RequestDelegate _next;

        private const string AUTH_HEADER = "Authorization";

        public BasicAuthMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var logger = context.RequestServices.GetService(typeof(Microsoft.Extensions.Logging.ILogger<BasicAuthMiddleware>)) as Microsoft.Extensions.Logging.ILogger;

            logger?.LogDebug("[BasicAuth] Incoming request: {Method} {Path}", context.Request.Method, context.Request.Path);

            if (context.Request.Headers.ContainsKey(AUTH_HEADER))
            {
                // Do NOT log the Authorization header or decoded credentials to avoid leaking secrets.
                logger?.LogDebug("[BasicAuth] Authorization header present");
            }
            else
            {
                logger?.LogWarning("[BasicAuth] Missing Authorization Header");
            }
            // Allow anonymous access to some public endpoints (health, root, ping, swagger, registration)
            var path = context.Request.Path.ToString().ToLowerInvariant();

            if (IsBypassedPath(path, context))
            {
                await _next(context);
                return;
            }

            if (path != null && (
                path == "/" ||
                path.Contains("/health") ||
                path.Contains("/ping") ||
                path.Contains("/swagger") ||
                // authentication endpoints should NOT require basic auth
                path.Contains("/api/auth/login") ||
                path.Contains("/api/auth/pin-login") ||
                path.Contains("/api/auth/pin-users") ||  // PIN user discovery (with optional org ID) 
                // registration endpoints should remain public
                path.Contains("/api/auth/register-company") ||
                path.Contains("/api/auth/register-user") ||
                path.Contains("/api/auth/register") ||
                // allow username availability check without credentials
                path.Contains("/api/auth/check-username") ||
                // refresh token endpoint should not require basic auth
                path.Contains("/api/auth/refresh-token") ||
                // logout endpoint should not require basic auth
                path.Contains("/api/auth/logout") ||
                // forgot password endpoint should not require basic auth
                path.Contains("/api/auth/forgot-password") ||
                // anonymous device-context lookup (rehydrates terminal context from device_token cookie on reload)
                path.Contains("/api/terminal/device-context") ||
                // public preorder endpoints (org token not required for GET /api/public/preorders/preorder-event and /api/public/preorders/menu-items, but will be required for GET /api/public/preorders/{externalId} to prevent abuse)
                path.Contains("/api/public/preorders") ||
                // public order self-service endpoints
                (path.StartsWith("/api/orders/") && path.EndsWith("/pickup-slot")) ||
                (path.StartsWith("/api/orders/") && path.EndsWith("/cancel"))
            ))
            {
                await _next(context);
                return;
            }

            if (!context.Request.Headers.ContainsKey(AUTH_HEADER))
            {
                logger?.LogWarning("Missing Authorization Header");
                // Don't send WWW-Authenticate header - we use Bearer/JWT not Basic auth
                // The interceptor and other middleware will handle 401 responses appropriately
                context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                await context.Response.WriteAsync("Missing Authorization Header");
                return;
            }

            var authHeader = context.Request.Headers[AUTH_HEADER].ToString();
            
            // Handle Bearer tokens (JWT from Angular interceptor) - allow them through
            // JWT validation will be handled by [Authorize] attributes on individual endpoints
            if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                logger?.LogDebug("[BasicAuth] Bearer token detected, allowing through to endpoint authorization");
                await _next(context);
                return;
            }
            
            // Handle Basic Auth (username:password in base64)
            if (!authHeader.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
            {
                // Avoid logging the header contents (may contain base64-encoded credentials).
                logger?.LogWarning("[BasicAuth] Invalid Authorization header format (missing Basic or Bearer prefix)");
                context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                await context.Response.WriteAsync("Invalid Authorization Header");
                return;
            }

            var encodedCredentials = authHeader.Substring("Basic ".Length).Trim();
            string username = string.Empty;
            string password = string.Empty;
            try
            {
                var credentialBytes = Convert.FromBase64String(encodedCredentials);
                var credentials = Encoding.UTF8.GetString(credentialBytes).Split(':', 2);
                if (credentials.Length != 2)
                {
                    // Avoid logging decoded credential contents; log non-sensitive diagnostics instead.
                    logger?.LogWarning("[BasicAuth] Invalid Authorization Header format after decoding (parts={Count})", credentials.Length);
                    context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                    await context.Response.WriteAsync("Invalid Authorization Header Format");
                    return;
                }
                username = credentials[0];
                password = credentials[1];
                // Do NOT log plaintext passwords. Log only the username.
                logger?.LogInformation("[BasicAuth] Decoded username: {Username}", username);
            }
            catch (Exception ex)
            {
                logger?.LogError(ex, "[BasicAuth] Failed to decode Authorization header");
                context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                await context.Response.WriteAsync("Invalid Authorization Header Encoding");
                return;
            }

            // Resolve DbContext per request
            var dbContext = context.RequestServices.GetService(typeof(PreOrderApp.Data.AppDbContext)) as PreOrderApp.Data.AppDbContext;
            logger?.LogDebug("[BasicAuth] Looking up user in DB: {Username}", username);
            if (dbContext == null)
            {
                logger?.LogError("Database context unavailable");
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                await context.Response.WriteAsync("Database context unavailable");
                return;
            }

            // Look up user in DB (any enabled user)
            var user = await dbContext.SystemUsers
                .FirstOrDefaultAsync(u => u.UserName == username && u.IsEnabled);
            if (user != null)
            {
                logger?.LogDebug("[BasicAuth] User found: {UserName}, Role: {Role}, IsEnabled: {IsEnabled}", user.UserName, user.UserRole, user.IsEnabled);
            }

            if (user == null)
            {
                logger?.LogWarning("[BasicAuth] User not found or not enabled: {Username}", username);
                context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                await context.Response.WriteAsync("Invalid Username or Password");
                return;
            }

            bool passwordValid = false;
            try
            {
                passwordValid = BCrypt.Net.BCrypt.Verify(password, user.PasswordHash);
                //logger?.LogDebug("[BasicAuth] Password verification result for {Username}: {Result}", username, passwordValid);
            }
            catch (Exception ex)
            {
                logger?.LogError(ex, "[BasicAuth] Error verifying password for user: {Username}", username);
            }

            if (!passwordValid)
            {
                logger?.LogWarning("[BasicAuth] Password verification failed for user: {Username}", username);
                context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                await context.Response.WriteAsync("Invalid Username or Password");
                return;
            }

            logger?.LogInformation("[BasicAuth] User {Username} authenticated successfully", username);
            // Optionally, set user info in context for downstream use
            context.Items["SystemUser"] = user;

            await _next(context);
        }


        private static bool IsBypassedPath(string path, HttpContext context)
        {

            var endpoint = context.GetEndpoint();
            if (endpoint?.Metadata.GetMetadata<AllowAnonymousAttribute>() != null)
            {
                return true;
            }
            return false;
        }
    }
}