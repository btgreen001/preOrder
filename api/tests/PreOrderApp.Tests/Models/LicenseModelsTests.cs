using PreOrderApp.Models;
using Xunit;

namespace PreOrderApp.Tests.Models;

public class LicenseModelsTests
{
    [Theory]
    [InlineData(LicenseTier.Basic, 1, false)]
    [InlineData(LicenseTier.Standard, 5, true)]
    [InlineData(LicenseTier.Professional, 25, true)]
    [InlineData(LicenseTier.Enterprise, int.MaxValue, true)]
    public void GetFeaturesForTier_ReturnsExpectedCoreValues(LicenseTier tier, int expectedMaxUsers, bool expectedAdvancedOrder)
    {
        var features = LicenseFeatures.GetFeaturesForTier(tier);

        Assert.Equal(expectedMaxUsers, features.MaxUsers);
        Assert.Equal(expectedAdvancedOrder, features.HasAdvancedOrderManagement);
    }

    [Fact]
    public void ComputeIdentityHash_IsDeterministicAndLowerHex()
    {
        var hash1 = LicenseUtils.ComputeIdentityHash("Bake Sweet", "owner@bake.com", "salt-value");
        var hash2 = LicenseUtils.ComputeIdentityHash("Bake Sweet", "owner@bake.com", "salt-value");

        Assert.Equal(hash1, hash2);
        Assert.Equal(64, hash1.Length);
        Assert.Matches("^[0-9a-f]+$", hash1);
    }

    [Fact]
    public void GenerateSalt_ReturnsNonEmptyBase64String()
    {
        var salt = LicenseUtils.GenerateSalt(32);

        Assert.False(string.IsNullOrWhiteSpace(salt));

        var bytes = Convert.FromBase64String(salt);
        Assert.Equal(32, bytes.Length);
    }

    [Fact]
    public void GetFeaturesForTier_InvalidTier_ThrowsArgumentOutOfRange()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => LicenseFeatures.GetFeaturesForTier((LicenseTier)999));
    }
}
