using System.Security.Cryptography;
using System.Text;

namespace OrderMgmt.Models
{
    public static class LicenseUtils
    {
        public static string GenerateSalt(int size = 32)
        {
            var bytes = new byte[size];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(bytes);
            return Convert.ToBase64String(bytes);
        }

        public static string ComputeIdentityHash(string organizationName, string email, string salt)
        {
            var input = $"{organizationName}:{email}:{salt}";
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(input));
            return BitConverter.ToString(bytes).Replace("-", "").ToLowerInvariant();
        }
    }
}