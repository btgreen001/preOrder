using PreOrderApp.Models;
using Xunit;

namespace PreOrderApp.Tests.Models;

public class TerminalModelsTests
{
    [Fact]
    public void OrganizationSetting_AsInt_ParsesValidInteger()
    {
        var setting = new OrganizationSetting { SettingValue = "15" };

        Assert.Equal(15, setting.AsInt());
    }

    [Fact]
    public void OrganizationSetting_AsInt_InvalidValue_ReturnsZero()
    {
        var setting = new OrganizationSetting { SettingValue = "not-a-number" };

        Assert.Equal(0, setting.AsInt());
    }

    [Theory]
    [InlineData("true", true)]
    [InlineData("TRUE", true)]
    [InlineData("1", true)]
    [InlineData("false", false)]
    [InlineData("0", false)]
    [InlineData(null, false)]
    public void OrganizationSetting_AsBool_ParsesExpectedValue(string? value, bool expected)
    {
        var setting = new OrganizationSetting { SettingValue = value };

        Assert.Equal(expected, setting.AsBool());
    }

    [Fact]
    public void TerminalDeviceBinding_Setters_NormalizeDateTimesToUtc()
    {
        var localBoundAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Local);
        var localLastSeenAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Local);
        var localUnboundAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Local);

        var binding = new TerminalDeviceBinding
        {
            BoundAt = localBoundAt,
            LastSeenAt = localLastSeenAt,
            UnboundAt = localUnboundAt
        };

        Assert.Equal(DateTimeKind.Utc, binding.BoundAt!.Value.Kind);
        Assert.Equal(DateTimeKind.Utc, binding.LastSeenAt.Kind);
        Assert.Equal(DateTimeKind.Utc, binding.UnboundAt!.Value.Kind);
    }

    [Fact]
    public void TerminalSessionLock_NullLockedAt_ReturnsZeroLockedDuration()
    {
        var sessionLock = new TerminalSessionLock { LockedAt = null };

        Assert.Equal(TimeSpan.Zero, sessionLock.LockedDuration);
        Assert.True(sessionLock.IsActive);
    }

    [Fact]
    public void Order_AndProductionTask_HaveExpectedDefaults()
    {
        var order = new Order();
        var productionTask = new ProductionTask();

        Assert.Equal("PENDING", order.OrderStatus);
        Assert.Equal(1, order.VersionNbr);
        Assert.Equal("Pending", productionTask.TaskStatus);
        Assert.Equal(1, productionTask.VersionNbr);
        Assert.Equal("system", productionTask.CreatedBy);
    }
}
