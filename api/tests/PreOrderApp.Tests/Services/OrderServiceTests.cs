using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using PreOrderApp.Data;
using PreOrderApp.Models;
using PreOrderApp.Services;
using PreOrderApp.Services.Interfaces;
using Xunit;

namespace PreOrderApp.Tests.Services;

public class OrderServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _context;
    private readonly OrderService _sut;

    public OrderServiceTests()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;
        _context = new AppDbContext(options);
        _context.Database.EnsureCreated();

        var logger = Mock.Of<ILogger<OrderService>>();
        var inventoryService = Mock.Of<IInventoryService>();
        _sut = new OrderService(_context, logger, inventoryService);
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }

    private async Task<(Organization org, Customer walkIn)> SeedOrgWithWalkInAsync(string suffix = "")
    {
        var org = new Organization
        {
            OrganizationId = Guid.NewGuid(),
            OrganizationName = $"Bakery{suffix}",
            PrimaryEmail = $"bakery{suffix}@test.com",
            RegistrationToken = Guid.NewGuid().ToString("N"),
            IsEnabled = true,
            CreatedOn = DateTime.UtcNow,
            ModifiedOn = DateTime.UtcNow
        };
        _context.Organizations.Add(org);

        var walkIn = new Customer
        {
            ExternalId = Guid.NewGuid(),
            OrganizationId = org.OrganizationId,
            Name = "Walk-In Customer",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            VersionNbr = 1
        };
        _context.Customers.Add(walkIn);
        await _context.SaveChangesAsync();
        return (org, walkIn);
    }

    private async Task<Order> SeedOrderAsync(Guid orgId, long customerId, string status = "PENDING")
    {
        var order = new Order
        {
            ExternalId = Guid.NewGuid(),
            OrganizationId = orgId,
            CustomerId = customerId,
            OrderDate = DateTime.UtcNow,
            OrderStatus = status,
            TotalAmount = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            VersionNbr = 1
        };
        _context.Orders.Add(order);
        await _context.SaveChangesAsync();
        return order;
    }

    // ── GetOrdersAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetOrdersAsync_NoOrders_ReturnsEmpty()
    {
        var (org, _) = await SeedOrgWithWalkInAsync("-empty");
        var result = await _sut.GetOrdersAsync(org.OrganizationId);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetOrdersAsync_WithOrders_ReturnsOnlyForThatOrg()
    {
        var (org1, walkIn1) = await SeedOrgWithWalkInAsync("-o1");
        var (org2, walkIn2) = await SeedOrgWithWalkInAsync("-o2");

        var org1Order1 = await SeedOrderAsync(org1.OrganizationId, walkIn1.Id);
        var org1Order2 = await SeedOrderAsync(org1.OrganizationId, walkIn1.Id);
        var org2Order = await SeedOrderAsync(org2.OrganizationId, walkIn2.Id);

        var results = await _sut.GetOrdersAsync(org1.OrganizationId);

        Assert.Equal(2, results.Count);
        Assert.Contains(results, o => o.ExternalId == org1Order1.ExternalId);
        Assert.Contains(results, o => o.ExternalId == org1Order2.ExternalId);
        Assert.DoesNotContain(results, o => o.ExternalId == org2Order.ExternalId);
    }

    // ── GetOrderByIdAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetOrderByIdAsync_ExistingOrder_ReturnsDto()
    {
        var (org, walkIn) = await SeedOrgWithWalkInAsync("-byid");
        var order = await SeedOrderAsync(org.OrganizationId, walkIn.Id);

        var result = await _sut.GetOrderByIdAsync(order.ExternalId, org.OrganizationId);

        Assert.NotNull(result);
        Assert.Equal(order.ExternalId, result.ExternalId);
    }

    [Fact]
    public async Task GetOrderByIdAsync_NotFound_ReturnsNull()
    {
        var result = await _sut.GetOrderByIdAsync(Guid.NewGuid(), Guid.NewGuid());
        Assert.Null(result);
    }

    [Fact]
    public async Task GetOrderByIdAsync_WrongOrg_ReturnsNull()
    {
        var (org, walkIn) = await SeedOrgWithWalkInAsync("-wrongorg");
        var order = await SeedOrderAsync(org.OrganizationId, walkIn.Id);

        var result = await _sut.GetOrderByIdAsync(order.ExternalId, Guid.NewGuid());

        Assert.Null(result);
    }

    // ── GetExternalOrderByIdAsync ─────────────────────────────────────────────

    [Fact]
    public async Task GetExternalOrderByIdAsync_ExistingOrder_ReturnsDto()
    {
        var (org, walkIn) = await SeedOrgWithWalkInAsync("-ext");
        var order = await SeedOrderAsync(org.OrganizationId, walkIn.Id);

        var result = await _sut.GetExternalOrderByIdAsync(order.ExternalId);

        Assert.NotNull(result);
        Assert.Equal(order.ExternalId, result.ExternalId);
    }

    [Fact]
    public async Task GetExternalOrderByIdAsync_NotFound_ReturnsNull()
    {
        var result = await _sut.GetExternalOrderByIdAsync(Guid.NewGuid());
        Assert.Null(result);
    }

    // ── CreateOrderAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task CreateOrderAsync_WithNoCustomerExternalId_UsesWalkInCustomer()
    {
        var (org, _) = await SeedOrgWithWalkInAsync("-create");

        var request = new CreateOrderRequest
        {
            SpecialInstructionTxt = "No nuts"
        };

        var result = await _sut.CreateOrderAsync(org.OrganizationId, request);

        Assert.NotNull(result);
        Assert.Equal("PENDING", result.OrderStatus);
        Assert.Equal("No nuts", result.SpecialInstructionTxt);
    }

    [Fact]
    public async Task CreateOrderAsync_WithSpecificCustomer_AssignsCustomer()
    {
        var (org, walkIn) = await SeedOrgWithWalkInAsync("-spec");

        var namedCustomer = new Customer
        {
            ExternalId = Guid.NewGuid(),
            OrganizationId = org.OrganizationId,
            Name = "Alice Smith",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            VersionNbr = 1
        };
        _context.Customers.Add(namedCustomer);
        await _context.SaveChangesAsync();

        var request = new CreateOrderRequest
        {
            CustomerExternalId = namedCustomer.ExternalId
        };

        var result = await _sut.CreateOrderAsync(org.OrganizationId, request);

        Assert.NotNull(result);
        Assert.Equal(namedCustomer.Id, result.CustomerId);
    }

    [Fact]
    public async Task CreateOrderAsync_CustomerNotFound_ThrowsKeyNotFound()
    {
        var (org, _) = await SeedOrgWithWalkInAsync("-notfound");

        var request = new CreateOrderRequest
        {
            CustomerExternalId = Guid.NewGuid() // does not exist
        };

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            _sut.CreateOrderAsync(org.OrganizationId, request));
    }

    [Fact]
    public async Task CreateOrderAsync_NoWalkInCustomer_ThrowsKeyNotFound()
    {
        var org = new Organization
        {
            OrganizationId = Guid.NewGuid(),
            OrganizationName = "NoWalkIn Bakery",
            PrimaryEmail = "nowalk@test.com",
            RegistrationToken = Guid.NewGuid().ToString("N"),
            IsEnabled = true,
            CreatedOn = DateTime.UtcNow,
            ModifiedOn = DateTime.UtcNow
        };
        _context.Organizations.Add(org);
        await _context.SaveChangesAsync();

        var request = new CreateOrderRequest(); // no CustomerExternalId → needs walk-in

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            _sut.CreateOrderAsync(org.OrganizationId, request));
    }

    // ── UpdateOrderStatusAsync ────────────────────────────────────────────────

    [Fact]
    public async Task UpdateOrderStatusAsync_ExistingOrder_UpdatesStatus()
    {
        var (org, walkIn) = await SeedOrgWithWalkInAsync("-status");
        var order = await SeedOrderAsync(org.OrganizationId, walkIn.Id, "PENDING");

        var result = await _sut.UpdateOrderStatusAsync(order.ExternalId, "COMPLETED");

        Assert.NotNull(result);
        Assert.Equal("COMPLETED", result.OrderStatus);

        var persisted = await _context.Orders.FindAsync(order.Id);
        Assert.Equal("COMPLETED", persisted!.OrderStatus);
    }

    [Fact]
    public async Task UpdateOrderStatusAsync_NotFound_ReturnsNull()
    {
        var result = await _sut.UpdateOrderStatusAsync(Guid.NewGuid(), "COMPLETED");
        Assert.Null(result);
    }

    // ── DeleteOrderAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteOrderAsync_ExistingOrder_SetsCancelledAndReturnsTrue()
    {
        var (org, walkIn) = await SeedOrgWithWalkInAsync("-del");
        var order = await SeedOrderAsync(org.OrganizationId, walkIn.Id);

        var result = await _sut.DeleteOrderAsync(order.ExternalId);

        Assert.True(result);
        var persisted = await _context.Orders.FindAsync(order.Id);
        Assert.Equal("CANCELLED", persisted!.OrderStatus);
    }

    [Fact]
    public async Task DeleteOrderAsync_NotFound_ReturnsFalse()
    {
        var result = await _sut.DeleteOrderAsync(Guid.NewGuid());
        Assert.False(result);
    }

    // ── GetOrdersByStatusAsync ────────────────────────────────────────────────

    [Fact]
    public async Task GetOrdersByStatusAsync_FiltersByStatus()
    {
        var (org, walkIn) = await SeedOrgWithWalkInAsync("-bystatus");
        await SeedOrderAsync(org.OrganizationId, walkIn.Id, "PENDING");
        await SeedOrderAsync(org.OrganizationId, walkIn.Id, "PENDING");
        await SeedOrderAsync(org.OrganizationId, walkIn.Id, "COMPLETED");

        var pending = await _sut.GetOrdersByStatusAsync(org.OrganizationId, "PENDING");
        var completed = await _sut.GetOrdersByStatusAsync(org.OrganizationId, "COMPLETED");

        Assert.Equal(2, pending.Count);
        Assert.Single(completed);
    }
}
