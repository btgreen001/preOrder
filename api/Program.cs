// ...existing code...
// ...existing code...
// Required for ASP.NET Core integration tests

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Sqlite;
using PreOrderApp.Data;
using PreOrderApp.Services;
using PreOrderApp.Services.Interfaces;
using PreOrderApp.Middleware;
using PreOrderApp.Filters;
using System.IO;
using IAuditService = PreOrderApp.Services.IAuditService;
using AuditService = PreOrderApp.Services.AuditService;

// Load environment variables from repository root (.env, then .env.local override)
var envPath = Path.Combine(Directory.GetCurrentDirectory(), "..", ".env");
var envLocalPath = Path.Combine(Directory.GetCurrentDirectory(), "..", ".env.local");
var builder = WebApplication.CreateBuilder(args);

if (File.Exists(envPath))
{
    DotNetEnv.Env.Load(envPath);
    if (builder.Environment.IsDevelopment() && File.Exists(envLocalPath))
    {
        DotNetEnv.Env.Load(envLocalPath);
    }
}
else
{
    Console.WriteLine($"WARNING: .env file not found at {Path.GetFullPath(envPath)}");
}


// Add environment variables to configuration
var pasetoSecretKey = Environment.GetEnvironmentVariable("PASETO_SECRET_KEY");
if (!string.IsNullOrWhiteSpace(pasetoSecretKey))
{
    builder.Configuration["Paseto:SecretKey"] = pasetoSecretKey;
}

// Add SMTP credentials from environment
var smtpApiKey = Environment.GetEnvironmentVariable("SMTP_API_KEY");
if (!string.IsNullOrWhiteSpace(smtpApiKey))
{
    builder.Configuration["Emails:Smtp:Password"] = smtpApiKey;
}

// Build connection string with environment variable
// Use DB_HOST env var for flexibility: "postgres" in docker-compose, "192.168.50.147" locally, "localhost" for dev
var apiKey = Environment.GetEnvironmentVariable("SMTP_API_KEY");

var dbHost = Environment.GetEnvironmentVariable("DB_HOST") ?? "localhost";
var dbPort = Environment.GetEnvironmentVariable("DB_PORT") ?? "5432";
var dbName = Environment.GetEnvironmentVariable("DB_NAME") ?? "appdb";
var dbUser = Environment.GetEnvironmentVariable("DB_USER") ?? "appuser";
var dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD") ?? "defaultpassword";
var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL");
if (!string.IsNullOrWhiteSpace(frontendUrl))
{
    builder.Configuration["Emails:RegisterBaseUrl"] = $"{frontendUrl.TrimEnd('/')}/register";
    builder.Configuration["Emails:OrderBaseUrl"] = $"{frontendUrl.TrimEnd('/')}/preorders/external";
}
var connectionString = $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPassword};SslMode=Disable;Timeout=30;";

Console.WriteLine($"INFO: Database connection details:");
Console.WriteLine($"  Host: {dbHost}");
Console.WriteLine($"  Port: {dbPort}");
Console.WriteLine($"  Database: {dbName}");
Console.WriteLine($"  User: {dbUser}");

// Register services
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddMemoryCache(); // For rate limiting
builder.Services.AddHttpContextAccessor(); // Required for OrganizationContextService
// Data Protection API: safe to ignore "unencrypted keys" warning in local development
// For production, configure with Azure Key Vault or similar via environment-specific configuration
builder.Services.AddDataProtection();
builder.Services.AddScoped<IOrganizationContextService, OrganizationContextService>(); // Centralized multi-tenant filtering
builder.Services.AddScoped<IOrganizationService, OrganizationService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<ISellableProductService, SellableProductService>();
builder.Services.AddScoped<IRecipeService, RecipeService>();
builder.Services.AddScoped<IRecipeStepService, RecipeStepService>();
builder.Services.AddScoped<IRecipeIngredientService, RecipeIngredientService>();
builder.Services.AddScoped<IRecipeCompositionService, RecipeCompositionService>();
builder.Services.AddScoped<IBatchService, BatchService>();
builder.Services.AddScoped<IWasteService, WasteService>();
builder.Services.AddScoped<IInventoryLotService, InventoryLotService>();
builder.Services.AddScoped<IProductMovementService, ProductMovementService>();
builder.Services.AddScoped<IRecipeCostingService, RecipeCostingService>();
builder.Services.AddScoped<IFIFOService, FIFOService>();
builder.Services.AddScoped<IProductionTaskService, ProductionTaskService>();
builder.Services.AddScoped<IInventoryDepletionService, InventoryDepletionService>();
builder.Services.AddScoped<IProductionDashboardService, ProductionDashboardService>();
builder.Services.AddScoped<IPinAdminService, PinAdminService>();
builder.Services.AddScoped<ITerminalService, TerminalService>();
builder.Services.AddScoped<IUnitConversionService, UnitConversionService>();
builder.Services.AddScoped<IMvpPreOrderService, MvpPreOrderService>();

// Configure HTTPS enforcement
builder.Services.AddHttpsRedirection(options =>
{
    options.RedirectStatusCode = StatusCodes.Status307TemporaryRedirect;
    options.HttpsPort = 5001;
});

// Add security headers
builder.Services.AddHsts(options =>
{
    options.Preload = true;
    options.IncludeSubDomains = true;
    options.MaxAge = TimeSpan.FromDays(365);
});

builder.Services.AddCors(options =>
{
    // Development: Allow CORS from any source (since we're developing on network)
    // Production: Should be restricted to specific origins
    if (builder.Environment.IsDevelopment())
    {
        options.AddPolicy("AllowReact", policy =>
        {
            // In development, allow any origin but do NOT use credentials with wildcard
            // Instead, echo back the origin and allow credentials
            policy.SetIsOriginAllowed(origin => true)
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials();  // Allow credentials (cookies, auth headers)
        });
    }
    else
    {
        // Production: Restrict to known origins
        options.AddPolicy("AllowReact", policy =>
        {
            if (!string.IsNullOrWhiteSpace(frontendUrl))
            {
                policy.WithOrigins(frontendUrl)
                      .AllowAnyMethod()
                      .AllowAnyHeader()
                      .AllowCredentials();
            }
            else
            {
                policy.WithOrigins(
                        "https://localhost:4200",
                        "http://localhost:4200"
                      )
                      .AllowAnyMethod()
                      .AllowAnyHeader()
                      .AllowCredentials();
            }
        });
    }
});
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IPasetoTokenService, PasetoTokenService>();
builder.Services.AddScoped<IOrganizationService, OrganizationService>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<IPinService, PinService>();
builder.Services.AddScoped<ITerminalLockService, TerminalLockService>();
builder.Services.AddScoped<ITerminalDeviceBindingService, TerminalDeviceBindingService>();
builder.Services.AddScoped<IOrganizationSettingService, OrganizationSettingService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<TenantAccessFilter>(); // Register the tenant validation filter
builder.Services.AddScoped<TenantAdminFilter>(); // Register the tenant admin role filter
builder.Services.AddScoped<TenantStaffOrAdminFilter>(); // Register the tenant staff/admin role filter
builder.Services.AddScoped<SysAdminFilter>(); // Register the system admin role filter

// Enable request body buffering so middleware and controllers can both read the request body
builder.Services.Configure<IISServerOptions>(options =>
{
    options.AllowSynchronousIO = true;
});

builder.Services.AddControllers(options =>
{
    options.Filters.AddService<TenantAccessFilter>(); // Apply filter globally to all controllers
    options.Filters.AddService<TenantAdminFilter>(); // Apply admin filter globally to all controllers
    options.Filters.AddService<TenantStaffOrAdminFilter>(); // Apply staff/admin filter globally where [RequireTenantStaffOrAdmin] is present
    options.Filters.AddService<SysAdminFilter>(); // Apply sysadmin filter globally where [ValidateSysAdmin] is present
})
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        // System.Text.Json handles Guid deserialization natively
        // If issues with terminalId field deserialization occur, uncomment custom converter below:
        // options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "PreOrder API",
        Version = "v1"
    });
});

// Add JWT Bearer authentication (using symmetric key from Paseto:SecretKey)
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Read PASETO secret key from environment variable
        var keyBase64 = Environment.GetEnvironmentVariable("PASETO_SECRET_KEY");
        if (string.IsNullOrWhiteSpace(keyBase64))
        {
            throw new InvalidOperationException("PASETO_SECRET_KEY environment variable is not configured");
        }
        var key = Convert.FromBase64String(keyBase64);
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = "preorderapp",
            ValidAudience = "preorderapp-api",
            IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(key),
            ClockSkew = TimeSpan.FromSeconds(10) // Allow 10 seconds of clock skew for time sync issues
        };
        
        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                Console.WriteLine($"JWT VALIDATION FAILED: {context.Exception.GetType().Name}: {context.Exception.Message}");
                if (context.Exception.InnerException != null)
                    Console.WriteLine($"  Inner: {context.Exception.InnerException.Message}");
                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddAuthorization();

var aspNetCoreUrls = Environment.GetEnvironmentVariable("ASPNETCORE_URLS") ?? string.Empty;
var httpsMode = Environment.GetEnvironmentVariable("BAKEBOARD_ENABLE_HTTPS");
var explicitHttpsOff = string.Equals(httpsMode, "false", StringComparison.OrdinalIgnoreCase);
var explicitHttpsOn = string.Equals(httpsMode, "true", StringComparison.OrdinalIgnoreCase);
var urlsAreHttpOnly = aspNetCoreUrls.Contains("http://", StringComparison.OrdinalIgnoreCase)
    && !aspNetCoreUrls.Contains("https://", StringComparison.OrdinalIgnoreCase);
//var useHttps = explicitHttpsOn || (!explicitHttpsOff && !urlsAreHttpOnly);
var runningOnFly = Environment.GetEnvironmentVariable("FLY_APP_NAME") != null;

var useHttps =
    !runningOnFly && (
        explicitHttpsOn ||
        (!explicitHttpsOff && !urlsAreHttpOnly)
    );

builder.WebHost.ConfigureKestrel(options =>
{
    // Default to HTTPS, but allow controlled HTTP mode for container/dev reliability.
    options.Listen(System.Net.IPAddress.Any, 5124, listenOptions =>
    {
        if (!useHttps)
        {
            Console.WriteLine("⚠ BAKEBOARD_ENABLE_HTTPS=false (or ASPNETCORE_URLS is http-only). Backend listening on HTTP at port 5124");
            return;
        }

        // Load certificate and key from PEM files and combine them
        var certPath = Environment.GetEnvironmentVariable("BAKEBOARD_TLS_CERT_PATH") ?? "/etc/ssl/certs/lh-cert.pem";
        var keyPath = Environment.GetEnvironmentVariable("BAKEBOARD_TLS_KEY_PATH") ?? "/etc/ssl/private/lh-cert-key.pem";

        if (!File.Exists(certPath) || !File.Exists(keyPath))
        {
            if (explicitHttpsOn)
            {
                throw new InvalidOperationException(
                    $"TLS certificate files not found. Cert: '{certPath}' (exists: {File.Exists(certPath)}), Key: '{keyPath}' (exists: {File.Exists(keyPath)}). " +
                    "Set BAKEBOARD_TLS_CERT_PATH and BAKEBOARD_TLS_KEY_PATH, or disable HTTPS with BAKEBOARD_ENABLE_HTTPS=false.");
            }

            useHttps = false;
            Console.WriteLine($"⚠ TLS files missing (cert: {certPath}, key: {keyPath}). Falling back to HTTP on port 5124.");
            return;
        }

        var cert = System.Security.Cryptography.X509Certificates.X509Certificate2.CreateFromPemFile(certPath, keyPath);
        cert = new System.Security.Cryptography.X509Certificates.X509Certificate2(cert.Export(System.Security.Cryptography.X509Certificates.X509ContentType.Pkcs12));
        listenOptions.UseHttps(cert);

        Console.WriteLine($"✓ TLS certificate loaded from: {certPath}");
        Console.WriteLine($"✓ TLS private key loaded from: {keyPath}");
    });
    Console.WriteLine(useHttps
        ? "✓ HTTPS enabled: Backend listening on HTTPS at port 5124"
        : "✓ HTTP enabled: Backend listening on HTTP at port 5124");
});
// Basic authentication will be handled manually in controllers or middleware.
var app = builder.Build();

// Apply migrations only when explicitly enabled.
// This avoids startup crashes in environments where schema is provisioned by SQL DDL scripts.
var applyMigrations = string.Equals(
    Environment.GetEnvironmentVariable("APPLY_MIGRATIONS_ON_STARTUP"),
    "true",
    StringComparison.OrdinalIgnoreCase);

applyMigrations = true;

if (applyMigrations)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<PreOrderApp.Data.AppDbContext>();
    db.Database.Migrate();
}
else
{
    Console.WriteLine("INFO: Skipping automatic EF migrations (set APPLY_MIGRATIONS_ON_STARTUP=true to enable).");
}

// Verify actual database connection and log the server-reported database name
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PreOrderApp.Data.AppDbContext>();
    try
    {
        var conn = db.Database.GetDbConnection();
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT current_database(), version()";
        using var reader = cmd.ExecuteReader();
        if (reader.Read())
        {
            Console.WriteLine($"INFO: Connected to database '{reader.GetString(0)}'");
            Console.WriteLine($"INFO: PostgreSQL {reader.GetString(1)}");
        }
        reader.Close();

        using var schemaCmd = conn.CreateCommand();
        schemaCmd.CommandText = "SELECT table_schema, table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE' ORDER BY table_schema, table_name;";
        try
        {
            using var schemaReader = schemaCmd.ExecuteReader();
            var tables = new System.Collections.Generic.List<string>();
            while (schemaReader.Read())
                tables.Add($"{schemaReader.GetString(0)}.{schemaReader.GetString(1)}");
            schemaReader.Close();

            if (tables.Count == 0)
            {
                Console.WriteLine("WARNING: No tables found — schema has not been applied. Run schema_ddl.sql against the database.");
            }
            else
            {
                Console.WriteLine($"INFO: {tables.Count} table(s) found in database:");
                foreach (var t in tables)
                    Console.WriteLine($"  {t}");

                bool hasAppUser = tables.Any(t => t.EndsWith(".app_user", StringComparison.OrdinalIgnoreCase));
                Console.WriteLine(hasAppUser
                    ? "INFO: Schema check passed — app_user table exists."
                    : "WARNING: app_user table not found — schema may be incomplete.");
            }
        }
        catch (Exception schemaEx)
        {
            Console.WriteLine($"WARNING: Schema check failed — {schemaEx.Message}");
        }

        conn.Close();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"ERROR: Could not connect to database at {dbHost}:{dbPort}/{dbName} — {ex.Message}");
    }
}

// Seed a default Admin user if none exist
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PreOrderApp.Data.AppDbContext>();
    bool hasUsers = false;
    try { hasUsers = db.SystemUsers.Any(); }
    catch (Exception ex)
    {
        Console.WriteLine($"WARNING: Could not check for existing users (schema may not be initialized): {ex.Message}");
        Console.WriteLine("INFO: Skipping admin seed. Apply schema_ddl.sql to the database first.");
    }
    if (!hasUsers)
    {
        // Seed a default organization
        var orgId = Guid.NewGuid();
        var org = new PreOrderApp.Models.Organization
        {
            OrganizationId = orgId,
            OrganizationName = "Default Organization",
            PrimaryEmail = "gandssoftware@gmail.com",
            AddressLine1 = "123 Main St",
            Locality = "City",
            Region = "Region",
            PostalCode = "00000",
            CountryCode = "US",
            RegistrationToken = Guid.NewGuid().ToString(),
            IsEnabled = true,
            CreatedOn = DateTime.UtcNow,
            ModifiedOn = DateTime.UtcNow
        };
        db.Organizations.Add(org);
        db.SaveChanges();

        // Seed the admin user with the org's OrganizationId
        var adminUser = new PreOrderApp.Models.SystemUser
        {
            UserId = Guid.NewGuid(),
            UserName = "admin",
            EmailAddress = "gandssoftware@gmail.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password"),
            FirstName = "System",
            LastName = "Administrator",
            OrganizationId = orgId,
            UserRole = "SystemAdmin",
            IsEnabled = true,
            CreatedOn = DateTime.UtcNow
        };
        db.SystemUsers.Add(adminUser);
        db.SaveChanges();
    }

    // Developer helper: if a SQL script to recreate test users exists, run it to ensure simple test accounts are present.
    try
    {
        var scriptPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "Database", "Scripts", "recreate-test-users-postgres.sql");
        if (!File.Exists(scriptPath))
        {
            // fallback: script next to project folder in repo
            scriptPath = Path.Combine(Directory.GetCurrentDirectory(), "Database", "Scripts", "recreate-test-users-postgres.sql");
        }

        if (File.Exists(scriptPath))
        {
            var sql = File.ReadAllText(scriptPath);
            var parts = sql.Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var part in parts)
            {
                var stmt = part.Trim();
                if (string.IsNullOrWhiteSpace(stmt)) continue;
                try
                {
                    db.Database.ExecuteSqlRaw(stmt + ";");
                }
                catch (Exception ex)
                {
                    // Log and continue
                    var logger = app.Services.GetService(typeof(Microsoft.Extensions.Logging.ILogger<Program>)) as Microsoft.Extensions.Logging.ILogger;
                    logger?.LogWarning(ex, "Failed to execute SQL statement from recreate-test-users.sql: {Statement}", stmt.Length > 200 ? stmt.Substring(0, 200) + "..." : stmt);
                }
            }
            db.SaveChanges();
        }
    }
    catch (Exception ex)
    {
        var logger = app.Services.GetService(typeof(Microsoft.Extensions.Logging.ILogger<Program>)) as Microsoft.Extensions.Logging.ILogger;
        logger?.LogWarning(ex, "Error running recreate-test-users.sql (dev helper)");
    }

    // Primary-path bootstrap for TODO-1032 (Unit Conversion):
    // Ensure the unit_conversion table + global seed rows exist on startup.
    // Script is idempotent (CREATE IF NOT EXISTS + upsert-style seed).
    try
    {
        var logger = app.Services.GetService(typeof(Microsoft.Extensions.Logging.ILogger<Program>)) as Microsoft.Extensions.Logging.ILogger;
        var unitSeedPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "Database", "20260227_TODO1032_UnitConversionSeed.sql");
        if (!File.Exists(unitSeedPath))
        {
            unitSeedPath = Path.Combine(Directory.GetCurrentDirectory(), "Database", "20260227_TODO1032_UnitConversionSeed.sql");
        }

        if (File.Exists(unitSeedPath))
        {
            var sql = File.ReadAllText(unitSeedPath);
            db.Database.ExecuteSqlRaw(sql);
            logger?.LogInformation("Applied unit conversion bootstrap SQL from {Path}", unitSeedPath);
        }
        else
        {
            logger?.LogWarning("Unit conversion bootstrap SQL not found at expected paths");
        }
    }
    catch (Exception ex)
    {
        var logger = app.Services.GetService(typeof(Microsoft.Extensions.Logging.ILogger<Program>)) as Microsoft.Extensions.Logging.ILogger;
        logger?.LogWarning(ex, "Error applying unit conversion bootstrap SQL");
    }

    
}

// Configure middleware
// Global exception handler - must be early to catch all errors
app.UseMiddleware<PreOrderApp.Infrastructure.GlobalExceptionHandlerMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "PreOrder API v1");
    });
}
else
{
    // Production security headers
    app.UseHsts();
}

// Enable buffering on the request stream so middleware can read the body without consuming it
// app.Use(async (context, next) =>
// {
//     context.Request.EnableBuffering();
//     await next();
// });

if (useHttps)
{
    app.UseHttpsRedirection();
}

// Security headers middleware
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["X-Permitted-Cross-Domain-Policies"] = "none";
    context.Response.Headers["Cross-Origin-Embedder-Policy"] = "require-corp";
    context.Response.Headers["Cross-Origin-Opener-Policy"] = "same-origin";
    context.Response.Headers["Cross-Origin-Resource-Policy"] = "cross-origin";
    
    // Content Security Policy - HTTPS only
    context.Response.Headers["Content-Security-Policy"] = 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self'; " +
        "connect-src 'self' https:; " +
        "frame-ancestors 'none';";
    
    await next();
});

// CORS middleware must be applied BEFORE routing for preflight requests to be handled
app.UseCors("AllowReact");

app.UseRouting();

// Rate limiting for auth endpoints
app.UseMiddleware<PreOrderApp.Middleware.RateLimitingMiddleware>();

// Basic authentication middleware - converts Basic Auth to HttpContext.Items
app.UseMiddleware<PreOrderApp.Middleware.BasicAuthMiddleware>();

app.UseAuthentication();

// Per-request session validation against UserSessions (active + not expired)
app.UseMiddleware<PreOrderApp.Middleware.SessionValidationMiddleware>();

app.UseAuthorization();

// Terminal idle timeout middleware - auto-locks terminals after inactivity
app.UseMiddleware<PreOrderApp.Middleware.TerminalIdleTimeoutMiddleware>();

// Terminal lock enforcement - checks if terminal is locked before allowing requests
app.UseMiddleware<PreOrderApp.Middleware.TerminalLockEnforcementMiddleware>();

// Device binding heartbeat - throttled LastSeenAt updates for bound devices
app.UseMiddleware<PreOrderApp.Middleware.DeviceBindingLastSeenMiddleware>();

app.MapControllers();

// Health check endpoints
app.MapGet("/", () => Results.Ok("PreOrder API Running"));
app.MapGet("/health", () => Results.Ok("Healthy"));
app.MapGet("/ping", () => Results.Ok("pong"));

app.Run();

public partial class Program { }