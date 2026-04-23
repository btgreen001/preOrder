using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using OrderMgmt.Models;

namespace OrderMgmt.Services;

public interface IPasetoTokenService
{
    string GenerateAccessToken(SystemUser user, Guid? terminalId = null, Guid? sessionId = null);
    string GenerateRefreshToken();
    ClaimsPrincipal ValidateAccessToken(string token);
    bool ValidateRefreshToken(string token);
}

public class PasetoTokenService : IPasetoTokenService
{
    private readonly IConfiguration _configuration;
    private readonly byte[] _secretKey;

    public PasetoTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
        _secretKey = Convert.FromBase64String(_configuration["Paseto:SecretKey"] ??
            throw new InvalidOperationException("PASETO secret key not configured"));
    }

    public string GenerateAccessToken(SystemUser user, Guid? terminalId = null, Guid? sessionId = null)
    {
        var expirationMinutes = _configuration.GetValue<int>("Paseto:AccessTokenExpirationMinutes", 15);
        var expiration = DateTime.UtcNow.AddMinutes(expirationMinutes);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, sessionId?.ToString() ?? Guid.NewGuid().ToString()),
            new Claim(JwtRegisteredClaimNames.UniqueName, user.UserName),
            new Claim("role", user.UserRole),
            new Claim("org_id", user.OrganizationId.ToString()),
            new Claim("terminal_id", terminalId?.ToString() ?? ""),
            new Claim(JwtRegisteredClaimNames.Iss, "ordermgmt"),
            new Claim(JwtRegisteredClaimNames.Aud, "ordermgmt-api")
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expiration,
            Issuer = "ordermgmt",
            Audience = "ordermgmt-api",
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(_secretKey),
                SecurityAlgorithms.HmacSha256)
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    public ClaimsPrincipal ValidateAccessToken(string token)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = "ordermgmt",
            ValidAudience = "ordermgmt-api",
            IssuerSigningKey = new SymmetricSecurityKey(_secretKey),
            ClockSkew = TimeSpan.Zero
        };

        var principal = tokenHandler.ValidateToken(token, validationParameters, out _);
        return principal;
    }

    public bool ValidateRefreshToken(string token)
    {
        try
        {
            var tokenBytes = Convert.FromBase64String(token);
            return tokenBytes.Length == 64; // 512 bits
        }
        catch
        {
            return false;
        }
    }
}