using System.Text.Json;
using System.Text.Json.Serialization;
using System.Globalization;

namespace PreOrderApp.Infrastructure;

/// <summary>
/// Custom JSON converter for DateTime that handles wall-clock business time formats.
/// 
/// Accepts:
/// - ISO 8601 format: "2026-04-23T19:30:00" or "2026-04-23T19:30:00Z"
/// - Wall-clock datetime: "2026-04-23T19:30" (from HTML datetime-local inputs)
/// - Date only: "2026-04-23" (from HTML date inputs, assumes 00:00)
/// 
/// Storage Behavior:
/// - Parses wall-clock strings as DateTimeKind.Unspecified (no timezone assumptions)
/// - Keeps business values exactly as entered by staff
/// - Serializes without timezone suffix so frontend date/datetime-local inputs round-trip cleanly
/// 
/// Per README.md Datetime Semantics: Business times (event opens/closes, pickup windows, slot times)
/// are wall-clock values entered and interpreted as-is by staff, without timezone conversion.
/// </summary>
public class WallClockDateTimeConverter : JsonConverter<DateTime>
{
    private static readonly string[] SupportedFormats = new[]
    {
        "yyyy-MM-dd'T'HH:mm:ss.fff",  // ISO with milliseconds
        "yyyy-MM-dd'T'HH:mm:ss",      // ISO without milliseconds
        "yyyy-MM-dd'T'HH:mm",         // datetime-local format (most common from HTML)
        "yyyy-MM-dd"                  // date input format
    };

    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.String)
        {
            throw new JsonException($"Unexpected token {reader.TokenType} when parsing DateTime. Expected String.");
        }

        string dateString = reader.GetString()!;

        // Reject empty strings
        if (string.IsNullOrWhiteSpace(dateString))
        {
            throw new JsonException($"DateTime field cannot be empty or whitespace. Expected format: YYYY-MM-DDTHH:mm or YYYY-MM-DD");
        }

        // Parse exact wall-clock formats with no timezone assumptions.
        if (DateTime.TryParseExact(dateString, SupportedFormats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var result))
        {
            return DateTime.SpecifyKind(result, DateTimeKind.Unspecified);
        }

        // Fallback to flexible parsing only for textual date strings (e.g., "May 27, 2026 09:30 PM").
        // This avoids accepting ambiguous numeric inputs like "05/10/2024".
        if (dateString.Any(char.IsLetter) &&
            DateTime.TryParse(dateString, CultureInfo.InvariantCulture, DateTimeStyles.None, out var flexResult))
        {
            return DateTime.SpecifyKind(flexResult, DateTimeKind.Unspecified);
        }

        throw new JsonException($"Unable to convert \"{dateString}\" to DateTime. Expected formats: YYYY-MM-DDTHH:mm, YYYY-MM-DD, or ISO 8601.");
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        // Serialize without timezone suffix to preserve wall-clock semantics.
        writer.WriteStringValue(value.ToString("yyyy-MM-dd'T'HH:mm:ss.fffffff", CultureInfo.InvariantCulture));
    }
}
