namespace PreOrderApp.Infrastructure;

public static class StringSanitizer
{
    public static string SanitizeForLog(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return "empty";

        var trimmed = value.Trim().ToLowerInvariant();

        trimmed = trimmed
            .Replace("\r", "")
            .Replace("\n", "")
            .Replace("\t", "");

        trimmed = string.Concat(trimmed.Where(c =>
            char.IsLetterOrDigit(c) || c == '-' || c == '_'));

        if (trimmed.Length == 0)
            return "invalid";

        return trimmed.Length > 40 ? trimmed[..40] + "..." : trimmed;
    }
}