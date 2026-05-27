using PreOrderApp.Infrastructure;
using Xunit;

namespace PreOrderApp.Tests.Infrastructure;

public class StringSanitizerTests
{
    [Theory]
    [InlineData(null, "empty")]
    [InlineData("", "empty")]
    [InlineData("\n\t", "empty")]
    public void SanitizeForLog_EmptyLikeValues_ReturnsEmpty(string? input, string expected)
    {
        Assert.Equal(expected, StringSanitizer.SanitizeForLog(input));
    }

    [Fact]
    public void SanitizeForLog_RemovesUnsafeCharactersAndLowercases()
    {
        var result = StringSanitizer.SanitizeForLog("  Org-Name_01!@#$\n  ");

        Assert.Equal("org-name_01", result);
    }

    [Fact]
    public void SanitizeForLog_OnlyUnsafeCharacters_ReturnsInvalid()
    {
        var result = StringSanitizer.SanitizeForLog(" !!!@@@### ");

        Assert.Equal("invalid", result);
    }

    [Fact]
    public void SanitizeForUse_TrimsAndRemovesControlCharacters()
    {
        var result = StringSanitizer.SanitizeForUse("  Hello\nWorld\t ");

        Assert.Equal("HelloWorld", result);
    }

    [Fact]
    public void SanitizeForUse_EnforcesMaxLength()
    {
        var longValue = new string('a', 120);

        var result = StringSanitizer.SanitizeForUse(longValue, 10);

        Assert.Equal("aaaaaaaaaa...", result);
    }

    [Theory]
    [InlineData("   ")]
    [InlineData("\r\n\t")]
    public void SanitizeForUse_WhitespaceOnly_ReturnsEmpty(string input)
    {
        var result = StringSanitizer.SanitizeForUse(input);

        Assert.Equal(string.Empty, result);
    }
}
