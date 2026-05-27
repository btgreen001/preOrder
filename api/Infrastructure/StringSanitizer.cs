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

        return trimmed.Length > 200 ? trimmed[..200] + "..." : trimmed;
    }

    public static string SanitizeUsername(string? value, int maxLength = 50)
    {
        if (string.IsNullOrWhiteSpace(value))
            return "";

        // Allowed: letters, numbers, period
        var sanitized = new string(
            value.Where(c =>
                char.IsLetterOrDigit(c) ||
                c == '.' || c=='-' || c=='_'
            ).ToArray()
        );

        // Trim to max length
        if (sanitized.Length > maxLength)
            sanitized = sanitized[..maxLength];

        return sanitized;
    }

    public static string SanitizeForUse(string? value, int maxLength = 200)
    {
        if (string.IsNullOrWhiteSpace(value))
            return "";

        // Trim whitespace at ends
        var trimmed = value.Trim();

        // Remove control characters (ASCII < 32 or == 127)
        trimmed = new string(trimmed.Where(c => !char.IsControl(c)).ToArray());

        // Optionally collapse weird whitespace (tabs, newlines)
        trimmed = trimmed
            .Replace("\r", "")
            .Replace("\n", "")
            .Replace("\t", "");

        // Enforce a reasonable max length
        if (trimmed.Length > maxLength)
            trimmed = trimmed[..maxLength] + "...";

        return trimmed;
    }



}