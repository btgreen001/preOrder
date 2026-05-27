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
    public void SanitizeForLog_RemovesAllControlCharacters()
    {
        var input = "A\rB\nC\tD";
        var result = StringSanitizer.SanitizeForLog(input);

        Assert.Equal("ABCD", result);
    }
    [Fact]
    public void SanitizeForLog_LengthUnderLimit_ReturnsUnchanged()
    {
        var input = new string('a', 199);
        var result = StringSanitizer.SanitizeForLog(input);

        Assert.Equal(input, result);
    }
    [Fact]
    public void SanitizeForLog_LengthAtLimit_ReturnsUnchanged()
    {
        var input = new string('a', 200);
        var result = StringSanitizer.SanitizeForLog(input);

        Assert.Equal(input, result);
    }
    [Fact]
    public void SanitizeForLog_LengthOverLimit_TruncatesAndAppendsEllipsis()
    {
        var input = new string('a', 201);
        var result = StringSanitizer.SanitizeForLog(input);

        Assert.Equal(new string('a', 200) + "...", result);
    }
    
    [Fact]
    public void SanitizeForLog_DoesNotAddEllipsisWhenNotTruncated()
    {
        var input = "hello";
        var result = StringSanitizer.SanitizeForLog(input);

        Assert.DoesNotContain("...", result);
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
    [Fact]
    public void SanitizeForUse_RemovesAllControlCharacters()
    {
        var input = "A\rB\nC\tD";
        var result = StringSanitizer.SanitizeForUse(input);

        Assert.Equal("ABCD", result);
    }
    [Fact]
    public void SanitizeForUse_LengthUnderLimit_ReturnsUnchanged()
    {
        var input = new string('a', 199);
        var result = StringSanitizer.SanitizeForUse(input);

        Assert.Equal(input, result);
    }
    [Fact]
    public void SanitizeForUse_LengthAtLimit_ReturnsUnchanged()
    {
        var input = new string('a', 200);
        var result = StringSanitizer.SanitizeForUse(input);

        Assert.Equal(input, result);
    }
    [Fact]
    public void SanitizeForUse_LengthOverLimit_TruncatesAndAppendsEllipsis()
    {
        var input = new string('a', 201);
        var result = StringSanitizer.SanitizeForUse(input);

        Assert.Equal(new string('a', 200) + "...", result);
    }
    [Fact]
    public void SanitizeForUse_DoesNotAddEllipsisWhenNotTruncated()
    {
        var input = "hello";
        var result = StringSanitizer.SanitizeForUse(input);

        Assert.DoesNotContain("...", result);
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
