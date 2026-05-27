using PreOrderApp.Services;
using Xunit;

namespace PreOrderApp.Tests.Services;

public class FractionUtilityTests
{
    [Theory]
    [InlineData("0.5", 0.5)]
    [InlineData("1/2", 0.5)]
    [InlineData("1 1/2", 1.5)]
    [InlineData("2", 2.0)]
    public void ParseToDecimal_ValidInputs_ReturnsExpectedDecimal(string input, decimal expected)
    {
        var result = FractionUtility.ParseToDecimal(input);

        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData(0.5, "1/2")]
    [InlineData(1.5, "1 1/2")]
    [InlineData(2.0, "2")]
    [InlineData(-0.25, "-1/4")]
    public void FormatFromDecimal_FormatsExpectedFraction(decimal value, string expected)
    {
        var result = FractionUtility.FormatFromDecimal(value);

        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("a/b")]
    [InlineData("1/0")]
    public void ParseToDecimal_InvalidInputs_ThrowsArgumentException(string input)
    {
        Assert.Throws<ArgumentException>(() => FractionUtility.ParseToDecimal(input));
    }
}
