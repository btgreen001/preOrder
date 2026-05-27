using System.Globalization;
using System.Text.Json;
using PreOrderApp.Infrastructure;
using Xunit;

namespace PreOrderApp.Tests.Infrastructure;

public class WallClockDateTimeConverterTests
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        Converters = { new WallClockDateTimeConverter() }
    };

    [Theory]
    [InlineData("\"2026-05-27T09:30\"", 2026, 5, 27, 9, 30)]
    [InlineData("\"2026-05-27\"", 2026, 5, 27, 0, 0)]
    [InlineData("\"2026-05-27T09:30:45\"", 2026, 5, 27, 9, 30)]
    public void Read_ValidWallClockStrings_ParsesAsUnspecified(string json, int year, int month, int day, int hour, int minute)
    {
        var result = JsonSerializer.Deserialize<DateTime>(json, SerializerOptions);

        Assert.Equal(year, result.Year);
        Assert.Equal(month, result.Month);
        Assert.Equal(day, result.Day);
        Assert.Equal(hour, result.Hour);
        Assert.Equal(minute, result.Minute);
        Assert.Equal(DateTimeKind.Unspecified, result.Kind);
    }

    [Fact]
    public void Converter_ParsesIsoWithMilliseconds()
    {
        var json = "\"2024-05-10T14:30:15.123\"";
        var result = JsonSerializer.Deserialize<DateTime>(json, SerializerOptions);

        Assert.Equal(new DateTime(2024, 5, 10, 14, 30, 15, 123), result);
    }

    [Fact]
    public void Converter_ParsesIsoWithoutMilliseconds()
    {
        var json = "\"2024-05-10T14:30:15\"";
        var result = JsonSerializer.Deserialize<DateTime>(json, SerializerOptions);

        Assert.Equal(new DateTime(2024, 5, 10, 14, 30, 15), result);
    }
    [Fact]
    public void Converter_ParsesDateOnly()
    {
        var json = "\"2024-05-10\"";
        var result = JsonSerializer.Deserialize<DateTime>(json, SerializerOptions);

        Assert.Equal(new DateTime(2024, 5, 10), result);
    }
    [Fact]
    public void Converter_RejectsUnsupportedFormat()
    {
        var json = "\"05/10/2024\""; // US format, not supported

        Assert.Throws<JsonException>(() =>
            JsonSerializer.Deserialize<DateTime>(json, SerializerOptions));
    }



    [Theory]
    [InlineData("\"\"")]
    [InlineData("\"   \"")]
    [InlineData("\"not-a-date\"")]
    public void Read_InvalidStrings_ThrowsJsonException(string json)
    {
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<DateTime>(json, SerializerOptions));
    }

    [Fact]
    public void Read_NonStringToken_ThrowsJsonException()
    {
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<DateTime>("123", SerializerOptions));
    }

    [Fact]
    public void Read_FlexibleDateFormat_UsesFallbackParser()
    {
        var result = JsonSerializer.Deserialize<DateTime>("\"May 27, 2026 09:30 PM\"", SerializerOptions);

        Assert.Equal(2026, result.Year);
        Assert.Equal(5, result.Month);
        Assert.Equal(27, result.Day);
        Assert.Equal(21, result.Hour);
        Assert.Equal(30, result.Minute);
        Assert.Equal(DateTimeKind.Unspecified, result.Kind);
    }

    [Fact]
    public void Write_SerializesWithoutTimezoneSuffix()
    {
        var value = DateTime.SpecifyKind(new DateTime(2026, 5, 27, 9, 30, 45, 123), DateTimeKind.Unspecified);

        var json = JsonSerializer.Serialize(value, SerializerOptions);

        Assert.Equal("\"2026-05-27T09:30:45.1230000\"", json);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("\t")]
    [InlineData("\r")]
    [InlineData("\n")]
    [InlineData(" \t\r\n ")]
    public void Converter_ThrowsForEmptyOrWhitespace(string? input)
    {
        var json = input is null ? "null" : $"\"{input}\"";

        Assert.Throws<JsonException>(() =>
            JsonSerializer.Deserialize<DateTime>(json, SerializerOptions));
    }
    [Fact]
    public void Converter_DoesNotThrowForValidDate()
    {
        var json = "\"2024-05-10\"";

        var result = JsonSerializer.Deserialize<DateTime>(json, SerializerOptions);

        Assert.Equal(new DateTime(2024, 5, 10), result);
    }

    [Theory]
    [InlineData("\"05/10/2024\"")]     // US format
    [InlineData("\"2024/05/10\"")]     // wrong separator
    [InlineData("\"2024-13-40\"")]     // invalid date
    [InlineData("\"2024-05-10 12:00\"")] // missing 'T'
    [InlineData("\"not-a-date\"")]     // garbage
    public void Converter_ThrowsForInvalidFormats(string json)
    {
        var ex = Assert.Throws<JsonException>(() =>
            JsonSerializer.Deserialize<DateTime>(json, SerializerOptions));

        Assert.Contains("Unable to convert", ex.Message);
        Assert.Contains("Expected formats", ex.Message);
        Assert.Contains(json.Trim('"'), ex.Message);

    }

}
