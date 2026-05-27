using Microsoft.EntityFrameworkCore;
using PreOrderApp.Data;
using PreOrderApp.Models;
using Xunit;

namespace PreOrderApp.Tests.Data;

public class AppDbContextModelConfigurationTests
{
    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite("Data Source=:memory:")
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public void Organization_HasParentForeignKeyWithRestrictDelete()
    {
        using var context = CreateContext();
        var entityType = context.Model.FindEntityType(typeof(Organization));

        Assert.NotNull(entityType);

        var parentFk = entityType!.GetForeignKeys()
            .Single(fk =>
                fk.PrincipalEntityType.ClrType == typeof(Organization) &&
                fk.Properties.Any(p => p.Name == nameof(Organization.ParentOrganizationId)));

        Assert.Equal(DeleteBehavior.Restrict, parentFk.DeleteBehavior);
        Assert.Equal("organization__parent_organization__FK", parentFk.GetConstraintName());
    }

    [Fact]
    public void Order_HasNamedStatusIndex()
    {
        using var context = CreateContext();
        var entityType = context.Model.FindEntityType(typeof(Order));

        Assert.NotNull(entityType);

        var statusIndex = entityType!.GetIndexes()
            .Single(idx => idx.Properties.Any(p => p.Name == nameof(Order.OrderStatus)));

        Assert.Equal("customer_order__status__IX", statusIndex.GetDatabaseName());
    }

    [Fact]
    public void TerminalDeviceBinding_HasExpectedCompositeIndexes()
    {
        using var context = CreateContext();
        var entityType = context.Model.FindEntityType(typeof(TerminalDeviceBinding));

        Assert.NotNull(entityType);

        var indexNames = entityType!.GetIndexes()
            .Select(i => i.GetDatabaseName())
            .ToList();

        Assert.Contains("idx_terminal_device_binding_org_token", indexNames);
        Assert.Contains("idx_terminal_device_binding_org_terminal_active", indexNames);
    }

    [Fact]
    public void UnitConversion_HasUniqueCompositeIndexForConversionPair()
    {
        using var context = CreateContext();
        var entityType = context.Model.FindEntityType(typeof(UnitConversion));

        Assert.NotNull(entityType);

        var index = entityType!.GetIndexes()
            .Single(i => i.GetDatabaseName() == "unit_conversion__organization_id_from_unit_to_unit__UIX");

        Assert.True(index.IsUnique);
    }
}
