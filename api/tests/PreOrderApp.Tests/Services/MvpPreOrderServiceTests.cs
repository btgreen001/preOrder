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

public class MvpPreOrderServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _context;
    private readonly MvpPreOrderService _sut;

    public MvpPreOrderServiceTests()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;
        _context = new AppDbContext(options);
        _context.Database.EnsureCreated();

        var auditService = Mock.Of<IAuditService>();
        var logger = Mock.Of<ILogger<MvpPreOrderService>>();
        _sut = new MvpPreOrderService(_context, auditService, logger);
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }

    private async Task<(Organization org, HolidayEvent holiday)> SeedOrgWithEventAsync(string suffix = "")
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

        var now = DateTime.Now; // wall-clock
        var holiday = new HolidayEvent
        {
            ExternalId = Guid.NewGuid(),
            OrganizationId = org.OrganizationId,
            Name = $"Thanksgiving{suffix}",
            OpensAt = now.AddDays(1),
            ClosesAt = now.AddDays(10),
            PickupStartDt = now.AddDays(11),
            PickupEndDt = now.AddDays(12),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.HolidayEvents.Add(holiday);
        await _context.SaveChangesAsync();

        return (org, holiday);
    }

    private static CreateHolidayEventRequest ValidEventRequest(string name = "Christmas") =>
        new()
        {
            Name = name,
            OpensAt = DateTime.Now.AddDays(1),
            ClosesAt = DateTime.Now.AddDays(10),
            PickupStartDt = DateTime.Now.AddDays(11),
            PickupEndDt = DateTime.Now.AddDays(12),
            IsActive = true
        };

    // ── CreateHolidayEventAsync ───────────────────────────────────────────────

    [Fact]
    public async Task CreateHolidayEventAsync_ClosesBeforeOpens_Throws()
    {
        var org = new Organization
        {
            OrganizationId = Guid.NewGuid(),
            OrganizationName = "Bakery",
            PrimaryEmail = "err@test.com",
            RegistrationToken = Guid.NewGuid().ToString("N"),
            IsEnabled = true,
            CreatedOn = DateTime.UtcNow,
            ModifiedOn = DateTime.UtcNow
        };
        _context.Organizations.Add(org);
        await _context.SaveChangesAsync();

        var request = ValidEventRequest();
        request.ClosesAt = request.OpensAt.AddDays(-1); // before opens

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.CreateHolidayEventAsync(org.OrganizationId, request));

        Assert.Contains("close time", ex.Message);
    }

    [Fact]
    public async Task CreateHolidayEventAsync_PickupEndBeforePickupStart_Throws()
    {
        var org = new Organization
        {
            OrganizationId = Guid.NewGuid(),
            OrganizationName = "Bakery",
            PrimaryEmail = "err2@test.com",
            RegistrationToken = Guid.NewGuid().ToString("N"),
            IsEnabled = true,
            CreatedOn = DateTime.UtcNow,
            ModifiedOn = DateTime.UtcNow
        };
        _context.Organizations.Add(org);
        await _context.SaveChangesAsync();

        var request = ValidEventRequest();
        request.PickupEndDt = request.PickupStartDt.AddDays(-1);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.CreateHolidayEventAsync(org.OrganizationId, request));

        Assert.Contains("Pickup end date", ex.Message);
    }

    [Fact]
    public async Task CreateHolidayEventAsync_PickupStartBeforeOpens_Throws()
    {
        var org = new Organization
        {
            OrganizationId = Guid.NewGuid(),
            OrganizationName = "Bakery",
            PrimaryEmail = "err3@test.com",
            RegistrationToken = Guid.NewGuid().ToString("N"),
            IsEnabled = true,
            CreatedOn = DateTime.UtcNow,
            ModifiedOn = DateTime.UtcNow
        };
        _context.Organizations.Add(org);
        await _context.SaveChangesAsync();

        var request = ValidEventRequest();
        request.PickupStartDt = request.OpensAt.AddDays(-5); // before open

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.CreateHolidayEventAsync(org.OrganizationId, request));

        Assert.Contains("Pickup start date", ex.Message);
    }

    [Fact]
    public async Task CreateHolidayEventAsync_ValidRequest_PersistsEvent()
    {
        var org = new Organization
        {
            OrganizationId = Guid.NewGuid(),
            OrganizationName = "Bakery",
            PrimaryEmail = "ok@test.com",
            RegistrationToken = Guid.NewGuid().ToString("N"),
            IsEnabled = true,
            CreatedOn = DateTime.UtcNow,
            ModifiedOn = DateTime.UtcNow
        };
        _context.Organizations.Add(org);
        await _context.SaveChangesAsync();

        var request = ValidEventRequest("Thanksgiving");

        var result = await _sut.CreateHolidayEventAsync(org.OrganizationId, request);

        Assert.NotEqual(Guid.Empty, result.ExternalId);
        Assert.Equal("Thanksgiving", result.Name);
        var saved = await _context.HolidayEvents.FindAsync(result.Id);
        Assert.NotNull(saved);
    }

    // ── GetAllHolidayEventsAsync / GetHolidayEventsAsync ─────────────────────

    [Fact]
    public async Task GetAllHolidayEventsAsync_ReturnsAllForOrg()
    {
        var (org, _) = await SeedOrgWithEventAsync("-all");
        // add one more event, inactive
        var inactive = new HolidayEvent
        {
            ExternalId = Guid.NewGuid(),
            OrganizationId = org.OrganizationId,
            Name = "Inactive Event",
            OpensAt = DateTime.Now.AddDays(1),
            ClosesAt = DateTime.Now.AddDays(2),
            PickupStartDt = DateTime.Now.AddDays(3),
            PickupEndDt = DateTime.Now.AddDays(4),
            IsActive = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.HolidayEvents.Add(inactive);
        await _context.SaveChangesAsync();

        var results = await _sut.GetAllHolidayEventsAsync(org.OrganizationId);

        Assert.Equal(2, results.Count);
    }

    [Fact]
    public async Task GetHolidayEventsAsync_ReturnsOnlyActive()
    {
        var (org, activeEvent) = await SeedOrgWithEventAsync("-active");
        var inactive = new HolidayEvent
        {
            ExternalId = Guid.NewGuid(),
            OrganizationId = org.OrganizationId,
            Name = "Old Event",
            OpensAt = DateTime.Now.AddDays(1),
            ClosesAt = DateTime.Now.AddDays(2),
            PickupStartDt = DateTime.Now.AddDays(3),
            PickupEndDt = DateTime.Now.AddDays(4),
            IsActive = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.HolidayEvents.Add(inactive);
        await _context.SaveChangesAsync();

        var results = await _sut.GetHolidayEventsAsync(org.OrganizationId);

        Assert.Single(results);
        Assert.Equal(activeEvent.ExternalId, results[0].ExternalId);
    }

    // ── UpdateHolidayEventAsync ───────────────────────────────────────────────

    [Fact]
    public async Task UpdateHolidayEventAsync_ClosesBeforeOpens_Throws()
    {
        var (org, holiday) = await SeedOrgWithEventAsync("-updErr");

        var request = new UpdateHolidayEventRequest
        {
            Name = holiday.Name,
            OpensAt = DateTime.Now.AddDays(5),
            ClosesAt = DateTime.Now.AddDays(3), // before opens
            PickupStartDt = DateTime.Now.AddDays(10),
            PickupEndDt = DateTime.Now.AddDays(11),
            IsActive = true
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.UpdateHolidayEventAsync(org.OrganizationId, holiday.ExternalId, request));

        Assert.Contains("close time", ex.Message);
    }

    [Fact]
    public async Task UpdateHolidayEventAsync_ValidRequest_UpdatesEvent()
    {
        var (org, holiday) = await SeedOrgWithEventAsync("-upd");

        var request = new UpdateHolidayEventRequest
        {
            Name = "Updated Name",
            OpensAt = DateTime.Now.AddDays(2),
            ClosesAt = DateTime.Now.AddDays(8),
            PickupStartDt = DateTime.Now.AddDays(9),
            PickupEndDt = DateTime.Now.AddDays(10),
            IsActive = true
        };

        var result = await _sut.UpdateHolidayEventAsync(org.OrganizationId, holiday.ExternalId, request);

        Assert.Equal("Updated Name", result.Name);
        var saved = await _context.HolidayEvents.FindAsync(holiday.Id);
        Assert.Equal("Updated Name", saved!.Name);
    }

    // ── CreateMenuItemAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task CreateMenuItemAsync_NegativePrice_Throws()
    {
        var (org, holiday) = await SeedOrgWithEventAsync("-menuErr");

        var request = new CreateMenuItemRequest
        {
            HolidayEventExternalId = holiday.ExternalId,
            Name = "Pie",
            Price = -1m
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.CreateMenuItemAsync(org.OrganizationId, request));

        Assert.Contains("price", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateMenuItemAsync_MaxPerOrderZero_Throws()
    {
        var (org, holiday) = await SeedOrgWithEventAsync("-menuZero");

        var request = new CreateMenuItemRequest
        {
            HolidayEventExternalId = holiday.ExternalId,
            Name = "Pie",
            Price = 10m,
            MaxPerOrder = 0
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.CreateMenuItemAsync(org.OrganizationId, request));

        Assert.Contains("Max-per-order", ex.Message);
    }

    [Fact]
    public async Task CreateMenuItemAsync_ValidRequest_PersistsItem()
    {
        var (org, holiday) = await SeedOrgWithEventAsync("-menu");

        var request = new CreateMenuItemRequest
        {
            HolidayEventExternalId = holiday.ExternalId,
            Name = "Pumpkin Pie",
            Price = 15.00m,
            MaxPerOrder = 3,
            SortOrder = 1
        };

        var result = await _sut.CreateMenuItemAsync(org.OrganizationId, request);

        Assert.NotEqual(Guid.Empty, result.ExternalId);
        Assert.Equal("Pumpkin Pie", result.Name);
        Assert.Equal(15.00m, result.Price);
        Assert.True(result.IsActive);
    }

    // ── CreatePickupSlotAsync ─────────────────────────────────────────────────

    [Fact]
    public async Task CreatePickupSlotAsync_EndBeforeStart_Throws()
    {
        var (org, holiday) = await SeedOrgWithEventAsync("-slotErr");

        var request = new CreatePickupSlotRequest
        {
            HolidayEventExternalId = holiday.ExternalId,
            SlotStartAt = DateTime.Now.AddDays(1).AddHours(2),
            SlotEndAt = DateTime.Now.AddDays(1), // before start
            Capacity = 5
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.CreatePickupSlotAsync(org.OrganizationId, request));

        Assert.Contains("end time", ex.Message);
    }

    [Fact]
    public async Task CreatePickupSlotAsync_ZeroCapacity_Throws()
    {
        var (org, holiday) = await SeedOrgWithEventAsync("-slotZero");

        var request = new CreatePickupSlotRequest
        {
            HolidayEventExternalId = holiday.ExternalId,
            SlotStartAt = DateTime.Now.AddDays(1),
            SlotEndAt = DateTime.Now.AddDays(1).AddHours(1),
            Capacity = 0
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _sut.CreatePickupSlotAsync(org.OrganizationId, request));

        Assert.Contains("capacity", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreatePickupSlotAsync_ValidRequest_PersistsSlot()
    {
        var (org, holiday) = await SeedOrgWithEventAsync("-slot");

        var request = new CreatePickupSlotRequest
        {
            HolidayEventExternalId = holiday.ExternalId,
            SlotStartAt = DateTime.Now.AddDays(11),
            SlotEndAt = DateTime.Now.AddDays(11).AddHours(2),
            Capacity = 10
        };

        var result = await _sut.CreatePickupSlotAsync(org.OrganizationId, request);

        Assert.NotEqual(Guid.Empty, result.ExternalId);
        Assert.Equal(10, result.Capacity);
        Assert.Equal(0, result.ReservedCount);
        Assert.True(result.IsActive);
    }

    // ── GetMenuItemsAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetMenuItemsAsync_ReturnsActiveItemsForEvent()
    {
        var (org, holiday) = await SeedOrgWithEventAsync("-items");

        _context.MenuItems.Add(new MenuItem
        {
            ExternalId = Guid.NewGuid(),
            OrganizationId = org.OrganizationId,
            HolidayEventId = holiday.Id,
            Name = "Apple Pie",
            Price = 12m,
            IsActive = true,
            SortOrder = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        _context.MenuItems.Add(new MenuItem
        {
            ExternalId = Guid.NewGuid(),
            OrganizationId = org.OrganizationId,
            HolidayEventId = holiday.Id,
            Name = "Old Item",
            Price = 5m,
            IsActive = false,
            SortOrder = 2,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var results = await _sut.GetMenuItemsAsync(org.OrganizationId, holiday.ExternalId);

        Assert.Single(results);
        Assert.Equal("Apple Pie", results[0].Name);
    }

    // ── GetPickupSlotsAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task GetPickupSlotsAsync_ReturnsActiveSlotsForEvent()
    {
        var (org, holiday) = await SeedOrgWithEventAsync("-slots");

        _context.PickupSlots.Add(new PickupSlot
        {
            ExternalId = Guid.NewGuid(),
            OrganizationId = org.OrganizationId,
            HolidayEventId = holiday.Id,
            SlotStartAt = DateTime.Now.AddDays(11),
            SlotEndAt = DateTime.Now.AddDays(11).AddHours(1),
            Capacity = 5,
            ReservedCount = 0,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var results = await _sut.GetPickupSlotsAsync(org.OrganizationId, holiday.ExternalId);

        Assert.Single(results);
    }
}
