using Microsoft.Extensions.Logging;
using PreOrderApp.Data;
using PreOrderApp.Models;
using System;
using System.Threading.Tasks;

namespace PreOrderApp.Services
{
    public interface IAuditService
    {
        Task LogEventAsync(string action, Guid? userId, Guid? organizationId, string? entityType, 
                          string? entityId, string? ipAddress, string? userAgent, string? details);
        
        Task LogLoginAsync(Guid userId, Guid organizationId, string ipAddress, string? userAgent, 
                          bool success, string? errorMessage = null);
        
        Task LogLogoutAsync(Guid userId, string ipAddress, string? userAgent);
        
        Task LogTokenRefreshAsync(Guid userId, string ipAddress, string? userAgent, 
                                 bool success, string? errorMessage = null);
        
        Task LogUnauthorizedAccessAsync(string ipAddress, string? userAgent, string? details);
    }

    public class AuditService : IAuditService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AuditService> _logger;
        private readonly bool _isProduction;

        public AuditService(AppDbContext context, ILogger<AuditService> logger, 
                          IWebHostEnvironment environment)
        {
            _context = context;
            _logger = logger;
            _isProduction = environment.IsProduction();
        }

        public async Task LogEventAsync(string action, Guid? userId, Guid? organizationId, 
                                       string? entityType, string? entityId, string? ipAddress, 
                                       string? userAgent, string? details)
        {
            var auditLog = new AuditLog
            {
                Action = action,
                UserId = userId,
                OrganizationId = organizationId,
                EntityType = entityType,
                EntityId = entityId,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                Details = details,
                Timestamp = DateTime.UtcNow
            };

            // Log to console in development, database in production
            if (_isProduction)
            {
                try
                {
                    _context.AuditLogs.Add(auditLog);
                    await _context.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to save audit log to database");
                }
            }
            else
            {
                // Development logging to console
                var logMessage = $"[AUDIT] {action} | User: {userId?.ToString() ?? "N/A"} | " +
                               $"Org: {organizationId?.ToString() ?? "N/A"} | IP: {ipAddress ?? "N/A"}";
                
                if (!string.IsNullOrEmpty(details))
                {
                    _logger.LogInformation("{Message} | Details: {Details}", logMessage, details);
                }
                else
                {
                    _logger.LogInformation(logMessage);
                }
            }
        }

        public async Task LogLoginAsync(Guid userId, Guid organizationId, string ipAddress, 
                                       string? userAgent, bool success, string? errorMessage = null)
        {
            var action = success ? AuditActions.Login : AuditActions.LoginFailed;
            var details = success ? "User logged in successfully" : $"Login attempt failed: {errorMessage}";
            
            await LogEventAsync(action, userId, organizationId, "SystemUser", userId.ToString(), 
                              ipAddress, userAgent, details);
        }

        public async Task LogLogoutAsync(Guid userId, string ipAddress, string? userAgent)
        {
            await LogEventAsync(AuditActions.Logout, userId, null, "SystemUser", userId.ToString(), 
                              ipAddress, userAgent, "User logged out");
        }

        public async Task LogTokenRefreshAsync(Guid userId, string ipAddress, string? userAgent, 
                                              bool success, string? errorMessage = null)
        {
            var action = success ? AuditActions.TokenRefresh : AuditActions.TokenRefreshFailed;
            var details = success ? "Access token refreshed" : $"Token refresh failed: {errorMessage}";
            
            await LogEventAsync(action, userId, null, "SystemUser", userId.ToString(), 
                              ipAddress, userAgent, details);
        }

        public async Task LogUnauthorizedAccessAsync(string ipAddress, string? userAgent, 
                                                     string? details)
        {
            await LogEventAsync(AuditActions.UnauthorizedAccess, null, null, null, null, 
                              ipAddress, userAgent, details ?? "Unauthorized access attempt");
        }
    }
}
