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

    [Theory]
    [InlineData("\"\"")]
    [InlineData("\"   \"")]
    [InlineData("\"not-a-date\"")]
    public void Read_InvalidStrings_ThrowsJsonException(string json)
    {
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<DateTime>(json, SerializerOptions));
    }

    [Fact]
    public void Write_SerializesWithoutTimezoneSuffix()
    {
        var value = DateTime.SpecifyKind(new DateTime(2026, 5, 27, 9, 30, 45, 123), DateTimeKind.Unspecified);

        var json = JsonSerializer.Serialize(value, SerializerOptions);

        Assert.Equal("\"2026-05-27T09:30:45.1230000\"", json);
    }
}
