using Microsoft.EntityFrameworkCore;
using PreOrderApp.Models;

namespace PreOrderApp.Data;


public class AppDbContext : Microsoft.EntityFrameworkCore.DbContext
    {
      public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options) { }

    public DbSet<Order> Orders { get; set; } = null!;

    public DbSet<Customer> Customers { get; set; } = null!;
    public DbSet<Supplier> Suppliers { get; set; } = null!;
    public DbSet<SellableProduct> SellableProducts { get; set; } = null!;
    public DbSet<InventoryItem> InventoryItems { get; set; } = null!;
    public DbSet<ItemCategory> ItemCategories { get; set; } = null!;
    public DbSet<ProductCategory> ProductCategories { get; set; } = null!;
    public DbSet<InventoryMovement> InventoryMovements { get; set; } = null!;
    public DbSet<OrderItem> OrderItems { get; set; } = null!;
    public DbSet<Organization> Organizations { get; set; } = null!;
    public DbSet<SystemUser> SystemUsers { get; set; } = null!;
    public DbSet<LicenseSubscription> LicenseSubscriptions { get; set; } = null!;
    public DbSet<RegistrationCode> RegistrationCodes { get; set; } = null!;
    public DbSet<UserSession> UserSessions { get; set; } = null!;
    public DbSet<AuditLog> AuditLogs { get; set; } = null!;

      // Holiday pre-order MVP entities
      public DbSet<HolidayEvent> HolidayEvents { get; set; } = null!;
      public DbSet<MenuItem> MenuItems { get; set; } = null!;
      public DbSet<PickupSlot> PickupSlots { get; set; } = null!;
      public DbSet<PreOrder> PreOrders { get; set; } = null!;
      public DbSet<PreOrderLine> PreOrderLines { get; set; } = null!;

    // Phase 3.1: Recipe and batch management
    public DbSet<RecipeDetail> RecipeDetails { get; set; } = null!;
    public DbSet<RecipeIngredient> RecipeIngredients { get; set; } = null!;
    public DbSet<RecipeComposition> RecipeCompositions { get; set; } = null!;
    public DbSet<RecipeStep> RecipeSteps { get; set; } = null!;
    public DbSet<RecipeProduct> RecipeProducts { get; set; } = null!;
    public DbSet<FinishedGoodsBatch> FinishedGoodsBatches { get; set; } = null!;
    public DbSet<WasteEvent> WasteEvents { get; set; } = null!;

    // Phase 3.3: Production task management
    public DbSet<ProductionTask> ProductionTasks { get; set; } = null!;

    // Inventory and Product Movement (Refactored Phase 3.1)
    public DbSet<InventoryLot> InventoryLots { get; set; } = null!;
    public DbSet<ProductMovement> ProductMovements { get; set; } = null!;
    
    // Phase 4: PIN Admin Management
    public DbSet<AdminAuditLog> AdminAuditLogs { get; set; } = null!;

    // Terminal Management and Organization Settings
    public DbSet<Terminal> Terminals { get; set; } = null!;
    public DbSet<TerminalSessionLock> TerminalSessionLocks { get; set; } = null!;
    public DbSet<TerminalDeviceBinding> TerminalDeviceBindings { get; set; } = null!;
    public DbSet<OrganizationSetting> OrganizationSettings { get; set; } = null!;
    
    // Inventory Onboarding (Phase 3.4 TODO-1029)
    public DbSet<IngredientTemplate> IngredientTemplates { get; set; } = null!;
      public DbSet<UnitConversion> UnitConversions { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Organization>(entity =>
        {
            entity.ToTable("organization", schema: "public");
            entity.HasKey(e => e.OrganizationId);
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.ParentOrganizationId).HasColumnName("parent_organization_id");
            entity.Property(e => e.OrganizationName).HasColumnName("organization_name");
            entity.Property(e => e.PrimaryEmail).HasColumnName("primary_email");
            entity.Property(e => e.ContactPhone).HasColumnName("contact_phone");
            entity.Property(e => e.AddressLine1).HasColumnName("address_line1");
            entity.Property(e => e.AddressLine2).HasColumnName("address_line2");
            entity.Property(e => e.AddressLine3).HasColumnName("address_line3");
            entity.Property(e => e.Locality).HasColumnName("locality");
            entity.Property(e => e.Region).HasColumnName("region");
            entity.Property(e => e.PostalCode).HasColumnName("postal_code");
            entity.Property(e => e.CountryCode).HasColumnName("country_code");
            entity.Property(e => e.RegistrationToken).HasColumnName("registration_token");
            entity.Property(e => e.IsEnabled).HasColumnName("is_enabled");
            entity.Property(e => e.CreatedOn).HasColumnName("created_on");
            entity.Property(e => e.ModifiedOn).HasColumnName("modified_on");
            entity.Property(e => e.HashSalt).HasColumnName("hash_salt");
            // Self-referencing FK for parent organization (multi-tenant hierarchies, Phase 3+)
            entity.HasOne(e => e.ParentOrganization)
                  .WithMany(o => o.ChildOrganizations)
                  .HasForeignKey(e => e.ParentOrganizationId)
                  .OnDelete(DeleteBehavior.Restrict)
                  .HasConstraintName("organization__parent_organization__FK");
            entity.HasIndex(e => e.PrimaryEmail).IsUnique().HasDatabaseName("ix_organization_primary_email");
            entity.HasIndex(e => e.RegistrationToken).IsUnique().HasDatabaseName("ix_organization_registration_token");
            entity.HasIndex(e => e.ParentOrganizationId).HasDatabaseName("organization__parent_organization_id__IX");
        });

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.ToTable("customer");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ExternalId).HasColumnName("external_id").IsRequired();
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255);
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255);
            entity.Property(e => e.Phone).HasColumnName("phone").HasMaxLength(20);
            entity.Property(e => e.Address).HasColumnName("address").HasMaxLength(512);
            entity.Property(e => e.City).HasColumnName("city").HasMaxLength(100);
            entity.Property(e => e.State).HasColumnName("state").HasMaxLength(100);
            entity.Property(e => e.ZipCode).HasColumnName("zip_code").HasMaxLength(20);
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.VersionNbr).HasColumnName("version_nbr");
            entity.HasOne(e => e.Organization)
                  .WithMany(o => o.Customers)
                  .HasForeignKey(e => e.OrganizationId)
                  .HasConstraintName("organization__customer__FK");
            entity.HasMany(e => e.Orders)
                  .WithOne(o => o.Customer)
                  .HasForeignKey(o => o.CustomerId)
                  .HasConstraintName("customer__customer_order__FK");
            entity.HasKey(e => e.Id).HasName("customer__id__PK");
            entity.HasIndex(e => e.ExternalId).IsUnique().HasDatabaseName("customer__external_id__UIX");
            entity.HasIndex(e => e.OrganizationId).HasDatabaseName("customer__organization_id__IX");
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("customer_order");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ExternalId).HasColumnName("external_id").IsRequired();
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.CustomerId).HasColumnName("customer_id");
            entity.Property(e => e.DeliveryId).HasColumnName("delivery_id");
            entity.Property(e => e.OrderDate).HasColumnName("order_date");
            entity.Property(e => e.OrderStatus).HasColumnName("order_status").HasMaxLength(50);
            entity.Property(e => e.TotalAmount).HasColumnName("total_amount").HasPrecision(10, 2);
            entity.Property(e => e.SpecialInstructionTxt).HasColumnName("special_instruction_txt");
            entity.Property(e => e.OrderedAt).HasColumnName("ordered_at");
            entity.Property(e => e.CompletedAt).HasColumnName("completed_at");
            entity.Property(e => e.CancelledAt).HasColumnName("cancelled_at");
            entity.Property(e => e.OrderPriority).HasColumnName("order_priority");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.VersionNbr).HasColumnName("version_nbr");
            entity.HasOne(e => e.Organization)
                  .WithMany(o => o.Orders)
                  .HasForeignKey(e => e.OrganizationId)
                  .HasConstraintName("organization__customer_order__FK");
            entity.HasOne(e => e.Customer)
                  .WithMany(c => c.Orders)
                  .HasForeignKey(e => e.CustomerId)
                  .HasConstraintName("customer__customer_order__FK");
            entity.HasMany(e => e.OrderItems)
                  .WithOne(oi => oi.Order)
                  .HasForeignKey(oi => oi.OrderId)
                  .HasConstraintName("customer_order__order_item__FK");
            entity.HasKey(e => e.Id).HasName("customer_order__id__PK");
            entity.HasIndex(e => e.ExternalId).IsUnique().HasDatabaseName("customer_order__external_id__UIX");
            entity.HasIndex(e => e.OrganizationId).HasDatabaseName("customer_order__organization_id__IX");
            entity.HasIndex(e => e.CustomerId).HasDatabaseName("customer_order__customer_id__IX");
            entity.HasIndex(e => e.OrderStatus).HasDatabaseName("customer_order__status__IX");
        });

        modelBuilder.Entity<HolidayEvent>(entity =>
        {
            entity.ToTable("holiday_event", schema: "public");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.ExternalId).HasColumnName("external_id").IsRequired();
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(200);
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.OpensOnUtc).HasColumnName("opens_on_utc");
            entity.Property(e => e.ClosesOnUtc).HasColumnName("closes_on_utc");
            entity.Property(e => e.PickupStartDateUtc).HasColumnName("pickup_start_date_utc");
            entity.Property(e => e.PickupEndDateUtc).HasColumnName("pickup_end_date_utc");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.HasOne(e => e.Organization)
                  .WithMany()
                  .HasForeignKey(e => e.OrganizationId)
                  .HasConstraintName("organization__holiday_event__FK");
            entity.HasIndex(e => e.ExternalId).IsUnique().HasDatabaseName("holiday_event__external_id__UIX");
            entity.HasIndex(e => e.OrganizationId).HasDatabaseName("holiday_event__organization_id__IX");
        });

        modelBuilder.Entity<MenuItem>(entity =>
        {
            entity.ToTable("menu_item", schema: "public");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.ExternalId).HasColumnName("external_id").IsRequired();
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.HolidayEventId).HasColumnName("holiday_event_id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(200);
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Price).HasColumnName("price").HasPrecision(10, 2);
            entity.Property(e => e.MaxPerOrder).HasColumnName("max_per_order");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.SortOrder).HasColumnName("sort_order");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.HasOne(e => e.Organization)
                  .WithMany()
                  .HasForeignKey(e => e.OrganizationId)
                  .HasConstraintName("organization__menu_item__FK");
            entity.HasOne(e => e.HolidayEvent)
                  .WithMany(h => h.MenuItems)
                  .HasForeignKey(e => e.HolidayEventId)
                  .HasConstraintName("holiday_event__menu_item__FK");
            entity.HasIndex(e => e.ExternalId).IsUnique().HasDatabaseName("menu_item__external_id__UIX");
            entity.HasIndex(e => new { e.OrganizationId, e.HolidayEventId }).HasDatabaseName("menu_item__organization_holiday_event__IX");
        });

        modelBuilder.Entity<PickupSlot>(entity =>
        {
            entity.ToTable("pickup_slot", schema: "public");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.ExternalId).HasColumnName("external_id").IsRequired();
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.HolidayEventId).HasColumnName("holiday_event_id");
            entity.Property(e => e.SlotStartUtc).HasColumnName("slot_start_utc");
            entity.Property(e => e.SlotEndUtc).HasColumnName("slot_end_utc");
            entity.Property(e => e.Capacity).HasColumnName("capacity");
            entity.Property(e => e.ReservedCount).HasColumnName("reserved_count");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.HasOne(e => e.Organization)
                  .WithMany()
                  .HasForeignKey(e => e.OrganizationId)
                  .HasConstraintName("organization__pickup_slot__FK");
            entity.HasOne(e => e.HolidayEvent)
                  .WithMany(h => h.PickupSlots)
                  .HasForeignKey(e => e.HolidayEventId)
                  .HasConstraintName("holiday_event__pickup_slot__FK");
            entity.HasIndex(e => e.ExternalId).IsUnique().HasDatabaseName("pickup_slot__external_id__UIX");
            entity.HasIndex(e => new { e.OrganizationId, e.HolidayEventId }).HasDatabaseName("pickup_slot__organization_holiday_event__IX");
        });

        modelBuilder.Entity<PreOrder>(entity =>
        {
            entity.ToTable("pre_order", schema: "public");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.ExternalId).HasColumnName("external_id").IsRequired();
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.HolidayEventId).HasColumnName("holiday_event_id");
            entity.Property(e => e.PickupSlotId).HasColumnName("pickup_slot_id");
            entity.Property(e => e.CustomerName).HasColumnName("customer_name").HasMaxLength(200);
            entity.Property(e => e.CustomerEmail).HasColumnName("customer_email").HasMaxLength(255);
            entity.Property(e => e.CustomerPhone).HasColumnName("customer_phone").HasMaxLength(30);
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50);
            entity.Property(e => e.TotalAmount).HasColumnName("total_amount").HasPrecision(10, 2);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.HasOne(e => e.Organization)
                  .WithMany()
                  .HasForeignKey(e => e.OrganizationId)
                  .HasConstraintName("organization__pre_order__FK");
            entity.HasOne(e => e.HolidayEvent)
                  .WithMany(h => h.PreOrders)
                  .HasForeignKey(e => e.HolidayEventId)
                  .HasConstraintName("holiday_event__pre_order__FK");
            entity.HasOne(e => e.PickupSlot)
                  .WithMany(s => s.PreOrders)
                  .HasForeignKey(e => e.PickupSlotId)
                  .HasConstraintName("pickup_slot__pre_order__FK");
            entity.HasMany(e => e.Lines)
                  .WithOne(l => l.PreOrder)
                  .HasForeignKey(l => l.PreOrderId)
                  .HasConstraintName("pre_order__pre_order_line__FK");
            entity.HasIndex(e => e.ExternalId).IsUnique().HasDatabaseName("pre_order__external_id__UIX");
            entity.HasIndex(e => new { e.OrganizationId, e.HolidayEventId }).HasDatabaseName("pre_order__organization_holiday_event__IX");
        });

        modelBuilder.Entity<PreOrderLine>(entity =>
        {
            entity.ToTable("pre_order_line", schema: "public");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.ExternalId).HasColumnName("external_id").IsRequired();
            entity.Property(e => e.PreOrderId).HasColumnName("pre_order_id");
            entity.Property(e => e.MenuItemId).HasColumnName("menu_item_id");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.UnitPrice).HasColumnName("unit_price").HasPrecision(10, 2);
            entity.HasOne(e => e.MenuItem)
                  .WithMany(m => m.PreOrderLines)
                  .HasForeignKey(e => e.MenuItemId)
                  .HasConstraintName("menu_item__pre_order_line__FK");
            entity.HasIndex(e => e.ExternalId).IsUnique().HasDatabaseName("pre_order_line__external_id__UIX");
            entity.HasIndex(e => e.PreOrderId).HasDatabaseName("pre_order_line__pre_order_id__IX");
        });

modelBuilder.Entity<RecipeStep>(entity =>
        {
            entity.ToTable("recipe_step");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.ExternalId).HasColumnName("external_id").IsRequired();
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.RecipeDetailId).HasColumnName("recipe_detail_id");
            entity.Property(e => e.IsDeleted).HasColumnName("delete_flg");
            entity.Property(e => e.StepNumber).HasColumnName("step_number");
            entity.Property(e => e.StepInstructionText).HasColumnName("step_instruction_text");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.VersionNbr).HasColumnName("version_nbr");
            entity.HasOne(e => e.Organization)
                  .WithMany()
                  .HasForeignKey(e => e.OrganizationId)
                  .HasConstraintName("organization__recipe_step__FK");
            entity.HasOne(e => e.RecipeDetail)
                  .WithMany(r => r.Steps)
                  .HasForeignKey(e => e.RecipeDetailId)
                  .HasConstraintName("recipe_detail__recipe_step__FK");
            entity.HasKey(e => e.Id).HasName("recipe_step__id__PK");
            entity.HasIndex(e => e.ExternalId).IsUnique().HasDatabaseName("recipe_step__external_id__UIX");
            entity.HasIndex(e => e.OrganizationId).HasDatabaseName("recipe_step__organization_id__IX");
        });

        modelBuilder.Entity<SystemUser>(entity =>
        {
            entity.ToTable("app_user", schema: "public");
            entity.HasKey(e => e.UserId);
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.EmailAddress).HasColumnName("email_address");
            entity.Property(e => e.UserName).HasColumnName("user_name");
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash");
            entity.Property(e => e.FirstName).HasColumnName("first_name");
            entity.Property(e => e.LastName).HasColumnName("last_name");
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.UserRole).HasColumnName("user_role");
            entity.Property(e => e.IsEnabled).HasColumnName("is_enabled");
            entity.Property(e => e.CreatedOn).HasColumnName("created_on");
            entity.Property(e => e.LastLoginOn).HasColumnName("last_login_on");
            entity.Property(e => e.PinHash).HasColumnName("pin_hash");
            entity.Property(e => e.PinAttempts).HasColumnName("pin_attempts");
            entity.Property(e => e.PinLockedUntil).HasColumnName("pin_locked_until");
            entity.Property(e => e.PinSetOn).HasColumnName("pin_set_on");
            entity.HasOne(e => e.Organization)
                  .WithMany()
                  .HasForeignKey(e => e.OrganizationId);
            entity.HasIndex(e => e.EmailAddress).IsUnique().HasDatabaseName("ix_systemuser_emailaddress");
            entity.HasIndex(e => e.UserName).IsUnique().HasDatabaseName("ix_systemuser_username");
            entity.HasIndex(e => e.OrganizationId).HasDatabaseName("ix_systemuser_organizationid");
        });

        modelBuilder.Entity<LicenseSubscription>(entity =>
        {
            entity.ToTable("license_subscription");
            entity.HasKey(e => e.SubscriptionId);
            entity.Property(e => e.SubscriptionId).HasColumnName("subscription_id");
            entity.Property(e => e.IdentityHash).HasColumnName("identity_hash");
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.Tier).HasColumnName("tier");
            entity.Property(e => e.StartDate).HasColumnName("start_date");
            entity.Property(e => e.EndDate).HasColumnName("end_date");
            entity.Property(e => e.ReferralCode).HasColumnName("referral_code");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedOn).HasColumnName("created_on");
            entity.Property(e => e.ModifiedOn).HasColumnName("modified_on");
            entity.HasOne(e => e.Organization)
                  .WithMany()
                  .HasForeignKey(e => e.OrganizationId);
            entity.HasIndex(e => e.OrganizationId).HasDatabaseName("ix_licensesubscription_organizationid");
            entity.HasIndex(e => e.IsActive).HasDatabaseName("ix_licensesubscription_isactive");
        });

        modelBuilder.Entity<RegistrationCode>(entity =>
        {
            entity.ToTable("registration_code");
            entity.HasKey(e => e.CodeId);
            entity.Property(e => e.CodeId).HasColumnName("code_id");
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.Code).HasColumnName("registration_code");
            entity.Property(e => e.CreatedByUserId).HasColumnName("created_by_user_id");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.UserRole).HasColumnName("user_role");
            entity.Property(e => e.ExpiresOn).HasColumnName("expires_on");
            entity.Property(e => e.IsUsed).HasColumnName("is_used");
            entity.Property(e => e.UsedByUserId).HasColumnName("used_by_user_id");
            entity.Property(e => e.UsedOn).HasColumnName("used_on");
            entity.Property(e => e.CreatedOn).HasColumnName("created_on");
            entity.HasOne(e => e.Organization)
                  .WithMany()
                  .HasForeignKey(e => e.OrganizationId);
            entity.HasOne(e => e.CreatedByUser)
                  .WithMany()
                  .HasForeignKey(e => e.CreatedByUserId);
            entity.HasOne(e => e.UsedByUser)
                  .WithMany()
                  .HasForeignKey(e => e.UsedByUserId);
            entity.HasIndex(e => e.OrganizationId).HasDatabaseName("ix_registrationcode_organizationid");
            entity.HasIndex(e => e.Code).IsUnique().HasDatabaseName("ix_registrationcode_registrationcode");
        });

        modelBuilder.Entity<UserSession>(entity =>
        {
            entity.ToTable("user_session", schema: "public");
            entity.HasKey(e => e.SessionId);
            entity.Property(e => e.SessionId).HasColumnName("session_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.SessionToken).HasColumnName("session_token");
            entity.Property(e => e.IpAddress).HasColumnName("ip_address");
            entity.Property(e => e.UserAgent).HasColumnName("user_agent");
            entity.Property(e => e.CreatedOn).HasColumnName("created_on");
            entity.Property(e => e.LastAccessedOn).HasColumnName("last_accessed_on");
            entity.Property(e => e.ExpiresOn).HasColumnName("expires_on");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId);
            entity.HasIndex(e => e.UserId).HasDatabaseName("ix_usersession_userid");
            entity.HasIndex(e => e.SessionToken).IsUnique().HasDatabaseName("ix_usersession_sessiontoken");
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("audit_log", schema: "public");
            entity.HasKey(e => e.LogId);
            entity.Property(e => e.LogId).HasColumnName("log_id").ValueGeneratedOnAdd();
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.Action).HasColumnName("action").HasMaxLength(100);
            entity.Property(e => e.EntityType).HasColumnName("entity_type").HasMaxLength(50);
            entity.Property(e => e.EntityId).HasColumnName("entity_id").HasMaxLength(255);
            entity.Property(e => e.Details).HasColumnName("details");
            entity.Property(e => e.IpAddress).HasColumnName("ip_address").HasMaxLength(45);
            entity.Property(e => e.UserAgent).HasColumnName("user_agent").HasMaxLength(500);
            entity.Property(e => e.Timestamp).HasColumnName("timestamp").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(e => e.Organization)
                  .WithMany()
                  .HasForeignKey(e => e.OrganizationId)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.ToTable("supplier");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ExternalId).HasColumnName("external_id").IsRequired();
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255);
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255);
            entity.Property(e => e.Phone).HasColumnName("phone").HasMaxLength(20);
            entity.Property(e => e.Address).HasColumnName("address").HasMaxLength(255);
            entity.Property(e => e.City).HasColumnName("city").HasMaxLength(100);
            entity.Property(e => e.State).HasColumnName("state").HasMaxLength(50);
            entity.Property(e => e.ZipCode).HasColumnName("zip_code").HasMaxLength(20);
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by");
            entity.Property(e => e.VersionNbr).HasColumnName("version_nbr");
            entity.HasOne(e => e.Organization)
                  .WithMany(o => o.Suppliers)
                  .HasForeignKey(e => e.OrganizationId)
                  .HasConstraintName("organization__supplier__FK");
            entity.HasKey(e => e.Id).HasName("supplier__id__PK");
            entity.HasIndex(e => e.ExternalId).IsUnique().HasDatabaseName("supplier__external_id__UIX");
            entity.HasIndex(e => e.OrganizationId).HasDatabaseName("supplier__organization_id__IX");
        });


        modelBuilder.Entity<ItemCategory>(entity =>
        {
            entity.ToTable("item_category");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ExternalId).HasColumnName("external_id").IsRequired();
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.CategoryName).HasColumnName("category_name").HasMaxLength(255);
            entity.Property(e => e.CategoryCode).HasColumnName("category_code").HasMaxLength(255);
            entity.Property(e => e.Description).HasColumnName("description").HasMaxLength(255);
            entity.Property(e => e.SortOrder).HasColumnName("sort_order");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by");
            entity.Property(e => e.VersionNbr).HasColumnName("version_nbr");
            entity.HasOne(e => e.Organization)
                  .WithMany(o => o.ItemCategories)
                  .HasForeignKey(e => e.OrganizationId)
                  .HasConstraintName("organization__item_category__FK");
            entity.HasKey(e => e.Id).HasName("item_category__id__PK");
            entity.HasIndex(e => e.ExternalId).IsUnique().HasDatabaseName("item_category__external_id__UIX");
            entity.HasIndex(e => e.OrganizationId).HasDatabaseName("item_category__organization_id__IX");
        });


        modelBuilder.Entity<ProductCategory>(entity =>
        {
            entity.ToTable("product_category");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ExternalId).HasColumnName("external_id").IsRequired();
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.CategoryName).HasColumnName("category_name").HasMaxLength(255);
            entity.Property(e => e.CategoryCode).HasColumnName("category_code").HasMaxLength(255);
            entity.Property(e => e.Description).HasColumnName("description").HasMaxLength(255);
            entity.Property(e => e.SortOrder).HasColumnName("sort_order");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by");
            entity.Property(e => e.VersionNbr).HasColumnName("version_nbr");
            entity.HasOne(e => e.Organization)
                  .WithMany(o => o.ProductCategories)
                  .HasForeignKey(e => e.OrganizationId)
                  .HasConstraintName("organization__product_category__FK");
            entity.HasKey(e => e.Id).HasName("product_category__id__PK");
            entity.HasIndex(e => e.ExternalId).IsUnique().HasDatabaseName("product_category__external_id__UIX");
            entity.HasIndex(e => e.OrganizationId).HasDatabaseName("product_category__organization_id__IX");
        });


        modelBuilder.Entity<SellableProduct>(entity =>
        {
            entity.ToTable("sellable_product");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ExternalId).HasColumnName("external_id").IsRequired();
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255);
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Sku).HasColumnName("sku").HasMaxLength(100);
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.UnitPrice).HasColumnName("unit_price").HasPrecision(18, 2);
            entity.Property(e => e.UnitCost).HasColumnName("unit_cost").HasPrecision(18, 2);
            entity.Property(e => e.QuantityOnHand).HasColumnName("quantity_on_hand").HasPrecision(10, 2);
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.IsRecipeComponent).HasColumnName("is_recipe_component");
            entity.Property(e => e.IsForSale).HasColumnName("is_for_sale");
            entity.Property(e => e.OutputUnitCount).HasColumnName("output_unit_cnt").HasPrecision(18, 6);
            entity.Property(e => e.OutputUnitMsr).HasColumnName("output_unit_msr").HasMaxLength(50);
                  entity.Property(e => e.ServingsPerPackage).HasColumnName("servings_per_package").HasPrecision(18, 4).HasDefaultValue(1m);
            entity.Property(e => e.BaseUnitsPerOutputUnit).HasColumnName("base_units_per_output_unit").HasPrecision(18, 8);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by");
            entity.Property(e => e.VersionNbr).HasColumnName("version_nbr");
            entity.HasOne(e => e.Organization)
                  .WithMany(o => o.SellableProducts)
                  .HasForeignKey(e => e.OrganizationId)
                  .HasConstraintName("organization__sellable_product__FK");
            entity.HasOne(e => e.ProductCategory)
                  .WithMany(c => c.ProductItems)
                  .HasForeignKey(e => e.CategoryId)
                  .OnDelete(DeleteBehavior.SetNull);
            entity.HasMany(e => e.OrderItems)
                  .WithOne(oi => oi.SellableProduct)
                  .HasForeignKey(oi => oi.SellableProductId)
                  .HasConstraintName("sellable_product__order_item__FK");
            entity.HasKey(e => e.Id).HasName("sellable_product__id__PK");
            entity.HasIndex(e => e.ExternalId).IsUnique().HasDatabaseName("sellable_product__external_id__UIX");
            entity.HasIndex(e => e.Sku).IsUnique().HasDatabaseName("sellable_product__sku__UIX");
            entity.HasIndex(e => e.OrganizationId).HasDatabaseName("sellable_product__organization_id__IX");
        });

        modelBuilder.Entity<InventoryItem>(entity =>
        {
            entity.ToTable("inventory_item");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ExternalId).HasColumnName("external_id").IsRequired();
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255);
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Sku).HasColumnName("sku").HasMaxLength(100);
            entity.Property(e => e.WarehouseLocation).HasColumnName("warehouse_location").HasMaxLength(100);
            entity.Property(e => e.QuantityOnHand).HasColumnName("quantity_on_hand").HasPrecision(18, 2);
            entity.Property(e => e.QuantityReserved).HasColumnName("quantity_reserved").HasPrecision(18, 2);
            entity.Property(e => e.UnitOfMeasure).HasColumnName("unit_of_measure").HasMaxLength(50);
            entity.Property(e => e.DefaultPurchaseUnitOfMeasure).HasColumnName("default_purchase_unit_of_measure").HasMaxLength(50);
            entity.Property(e => e.DefaultItemDensity).HasColumnName("default_item_density").HasPrecision(18, 8);
            entity.Property(e => e.BatchNumber).HasColumnName("batch_number").HasMaxLength(100);
            entity.Property(e => e.ExpirationDate).HasColumnName("expiration_date");
            entity.Property(e => e.UnitCost).HasColumnName("unit_cost").HasPrecision(18, 2);
            entity.Property(e => e.LastReceivedAt).HasColumnName("last_received_at");
            entity.Property(e => e.LastUsedAt).HasColumnName("last_used_at");
            entity.Property(e => e.ReorderPoint).HasColumnName("reorder_point").HasPrecision(18, 2);
            entity.Property(e => e.ReorderQty).HasColumnName("reorder_qty").HasPrecision(18, 2);
            entity.Property(e => e.SupplierId).HasColumnName("supplier_id");
            entity.Property(e => e.LastOrderDate).HasColumnName("last_order_date");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by");
            entity.Property(e => e.VersionNbr).HasColumnName("version_nbr");
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.HasOne(e => e.Organization)
                  .WithMany(o => o.InventoryItems)
                  .HasForeignKey(e => e.OrganizationId)
                  .OnDelete(DeleteBehavior.Restrict)
                  .HasConstraintName("organization__inventory_item__FK");
            entity.HasOne(e => e.Supplier)
                  .WithMany(s => s.InventoryItems)
                  .HasForeignKey(e => e.SupplierId)
                  .OnDelete(DeleteBehavior.SetNull)
                  .HasConstraintName("inventory_item__supplier__FK");
            entity.HasOne(e => e.ItemCategory)
                  .WithMany(c => c.InventoryItems)
                  .HasForeignKey(e => e.CategoryId)
                  .OnDelete(DeleteBehavior.SetNull);
            entity.HasMany(e => e.Movements)
                  .WithOne(im => im.InventoryItem)
                  .HasForeignKey(im => im.InventoryItemId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("inventory_item__inventory_movement__FK");
            entity.HasKey(e => e.Id).HasName("inventory_item__id__PK");
            entity.HasIndex(e => e.ExternalId).IsUnique().HasDatabaseName("inventory_item__external_id__UIX");
            entity.HasIndex(e => e.OrganizationId).HasDatabaseName("inventory_item__organization_id__IX");
            entity.HasIndex(e => e.ReorderPoint).HasDatabaseName("inventory_item__reorder_point__IX");
            entity.HasIndex(e => e.ExpirationDate).HasDatabaseName("inventory_item__expiration_date__IX");
        });

        modelBuilder.Entity<InventoryMovement>(entity =>
        {
            entity.ToTable("inventory_movement");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ExternalId).HasColumnName("external_id").IsRequired();
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.InventoryItemId).HasColumnName("inventory_item_id");
            entity.Property(e => e.InventoryLotId).HasColumnName("inventory_lot_id");
            entity.Property(e => e.MovementType).HasColumnName("movement_type").HasMaxLength(50);
            entity.Property(e => e.QuantityChange).HasColumnName("quantity_change").HasPrecision(18, 2);
            entity.Property(e => e.Reason).HasColumnName("reason").HasMaxLength(255);
            entity.Property(e => e.ReferenceId).HasColumnName("reference_id").HasMaxLength(100);
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by");
            entity.Property(e => e.VersionNbr).HasColumnName("version_nbr");
            entity.HasOne(e => e.Organization)
                  .WithMany(o => o.InventoryMovements)
                  .HasForeignKey(e => e.OrganizationId)
                  .HasConstraintName("organization__inventory_movement__FK");
            entity.HasOne(e => e.InventoryItem)
                  .WithMany(ii => ii.Movements)
                  .HasForeignKey(e => e.InventoryItemId)
                  .HasConstraintName("inventory_item__inventory_movement__FK");
            entity.HasOne(e => e.InventoryLot)
                  .WithMany(il => il.Movements)
                  .HasForeignKey(e => e.InventoryLotId)
                  .OnDelete(DeleteBehavior.SetNull)
                  .HasConstraintName("inventory_lot__inventory_movement__FK");
            entity.HasKey(e => e.Id).HasName("inventory_movement__id__PK");
            entity.HasIndex(e => e.ExternalId).IsUnique().HasDatabaseName("inventory_movement__external_id__UIX");
            entity.HasIndex(e => e.OrganizationId).HasDatabaseName("inventory_movement__organization_id__IX");
            entity.HasIndex(e => e.InventoryItemId).HasDatabaseName("inventory_movement__inventory_item_id__IX");
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.ToTable("order_item");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ExternalId).HasColumnName("external_id").IsRequired();
            entity.Property(e => e.OrderId).HasColumnName("customer_order_id");
            entity.Property(e => e.SellableProductId).HasColumnName("product_id");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.UnitPrice).HasColumnName("unit_price").HasPrecision(18, 2);
            // NOTE: LineTotal removed from model - it's a calculated value (UnitPrice × Quantity), not persisted
            entity.Property(e => e.Customizations).HasColumnName("customizations");
            entity.Property(e => e.FulfilledQty).HasColumnName("fulfilled_qty").HasPrecision(18, 2);
            entity.Property(e => e.OrderItemStatus).HasColumnName("order_item_status").HasMaxLength(50);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by");
            entity.Property(e => e.VersionNbr).HasColumnName("version_nbr");
            entity.HasOne(e => e.Order)
                  .WithMany(o => o.OrderItems)
                  .HasForeignKey(e => e.OrderId)
                  .HasConstraintName("customer_order__order_item__FK");
            entity.HasOne(e => e.SellableProduct)
                  .WithMany(sp => sp.OrderItems)
                  .HasForeignKey(e => e.SellableProductId)
                  .HasConstraintName("sellable_product__order_item__FK");
            entity.HasKey(e => e.Id).HasName("order_item__id__PK");
            entity.HasIndex(e => e.ExternalId).IsUnique().HasDatabaseName("order_item__external_id__UIX");
            entity.HasIndex(e => e.OrderId).HasDatabaseName("order_item__order_id__IX");
            entity.HasIndex(e => e.SellableProductId).HasDatabaseName("order_item__sellable_product_id__IX");
            entity.HasIndex(e => e.OrderItemStatus).HasDatabaseName("order_item__status__IX");
        });

        // Phase 3.1: Recipe and Batch Management
        modelBuilder.Entity<RecipeDetail>(entity =>
        {
            entity.ToTable("recipe_detail");
            entity.HasKey(e => e.Id).HasName("recipe_detail__id__PK");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ExternalId).HasColumnName("external_id").IsRequired();
            entity.HasIndex(e => e.ExternalId).IsUnique().HasDatabaseName("recipe_detail__external_id__UIX");
            entity.Property(e => e.MasterId).HasColumnName("master_id");
            entity.HasIndex(e => e.MasterId).HasDatabaseName("recipe_detail__master_id__IX");
            entity.Property(e => e.RecipeVersionNbr).HasColumnName("recipe_version_nbr");
            entity.Property(e => e.RecipeStatusCd).HasColumnName("recipe_status_cd");
            entity.Property(e => e.StartDt).HasColumnName("start_dt");
            entity.Property(e => e.EndDt).HasColumnName("end_dt");
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.HasIndex(e => e.OrganizationId).HasDatabaseName("recipe_detail__organization_id__IX");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.ApprovedBy).HasColumnName("approved_by");
            entity.Property(e => e.ApprovedAt).HasColumnName("approved_at");
            entity.Property(e => e.RecipeName).HasColumnName("recipe_name").HasMaxLength(255);
            entity.Property(e => e.Description).HasColumnName("description").HasMaxLength(2000);
            // servings per batch
            entity.Property(e => e.YieldServingCnt).HasColumnName("yield_serving_cnt");
            // unit of measure for serving (g, kg, etc.)
            entity.Property(e => e.YieldUnit).HasColumnName("yield_unit").HasMaxLength(50);
            entity.Property(e => e.UnitsPerServing).HasColumnName("units_per_serving").HasPrecision(8, 4);
            entity.Property(e => e.CostPerUnit).HasColumnName("cost_per_unit").HasPrecision(18, 4);
            //entity.Property(e => e.IsActive).HasColumnName("is_active"); // replaced by recipeVersion and Statuses
            entity.Property(e => e.IsDeleted).HasColumnName("is_deleted");
            entity.Property(e => e.PrepTimeMin).HasColumnName("prep_time_min");
            entity.Property(e => e.ActiveTimeMin).HasColumnName("active_time_min");
            entity.Property(e => e.CookTimeMin).HasColumnName("cook_time_min");
            entity.Property(e => e.RestTimeMin).HasColumnName("rest_time_min");
            entity.Property(e => e.InactiveTimeMin).HasColumnName("inactive_time_min");
            entity.Property(e => e.TotalTimeMin).HasColumnName("total_time_min");
            entity.Property(e => e.ShelfLifeDayCnt).HasColumnName("shelf_life_day_cnt").HasPrecision(3, 0);
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.VersionNbr).HasColumnName("version_nbr");
            entity.HasIndex(e => e.ApprovedBy).HasDatabaseName("recipe_detail__approved_by__IX");
            entity.HasOne(e => e.Product)
                  .WithMany()
                  .HasForeignKey(e => e.ProductId)
                  .HasConstraintName("recipe_detail__sellable_product__FK")
                  .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.MasterRecipe)
                  .WithMany(r => r.RecipeVersions)
                  .HasForeignKey(e => e.MasterId)
                  .HasConstraintName("recipe_detail__recipe_detail_master__FK")
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Organization)
                  .WithMany()
                  .HasForeignKey(e => e.OrganizationId)
                  .HasConstraintName("recipe_detail__organization__FK");
        });

        modelBuilder.Entity<RecipeIngredient>(entity =>
        {
            entity.ToTable("recipe_ingredient");
            entity.HasKey(e => e.Id).HasName("recipe_ingredient__id__PK");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ExternalId).HasColumnName("external_id").IsRequired();
            entity.HasIndex(e => e.ExternalId).IsUnique().HasDatabaseName("recipe_ingredient__external_id__UIX");
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.HasIndex(e => e.OrganizationId).HasDatabaseName("recipe_ingredient__organization_id__IX");
            entity.Property(e => e.RecipeId).HasColumnName("recipe_id");
            entity.HasIndex(e => e.RecipeId).HasDatabaseName("recipe_ingredient__recipe_id__IX");
            entity.Property(e => e.InventoryItemId).HasColumnName("inventory_item_id");
            entity.HasIndex(e => e.InventoryItemId).HasDatabaseName("recipe_ingredient__inventory_item_id__IX");
            entity.Property(e => e.InventoryItemId).HasColumnName("inventory_item_id");
            entity.HasIndex(e => e.InventoryItemId).HasDatabaseName("recipe_ingredient__inventory_item_id__IX");
            entity.Property(e => e.RecipeComponentProductId).HasColumnName("recipe_component_product_id");
            entity.HasIndex(e => e.RecipeComponentProductId).HasDatabaseName("recipe_ingredient__recipe_component_product_id__IX");
            
            entity.Property(e => e.QuantityRequired).HasColumnName("quantity_required").HasPrecision(18, 4);
            entity.Property(e => e.Unit).HasColumnName("unit").HasMaxLength(50);
            entity.Property(e => e.CostPerUnit).HasColumnName("cost_per_unit").HasPrecision(18, 4);
            entity.Property(e => e.CreatedBy).HasColumnName("created_by").HasMaxLength(255);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by").HasMaxLength(255);
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.VersionNbr).HasColumnName("version_nbr");
            entity.Property(e => e.PurposeText).HasColumnName("purpose_txt");
            entity.Property(e => e.SequenceNumber).HasColumnName("sequence_number");
            entity.Property(e => e.IsDeleted).HasColumnName("is_deleted");
            entity.HasOne(e => e.Recipe)
                  .WithMany(r => r.Ingredients)
                  .HasForeignKey(e => e.RecipeId)
                  .HasConstraintName("recipe_detail__recipe_ingredient__FK");
            entity.HasOne(e => e.InventoryItem)
                  .WithMany()
                  .HasForeignKey(e => e.InventoryItemId)
                  .HasConstraintName("inventory_item__recipe_ingredient__FK");
            entity.HasOne(e => e.RecipeComponentProduct)
                  .WithMany()
                  .HasForeignKey(e => e.RecipeComponentProductId)
                  .HasConstraintName("sellable_product__recipe_ingredient_component__FK");
            entity.HasOne(e => e.Organization)
                  .WithMany()
                  .HasForeignKey(e => e.OrganizationId)
                  .HasConstraintName("recipe_ingredient__organization__FK");
        });

        modelBuilder.Entity<RecipeComposition>(entity =>
        {
            entity.ToTable("recipe_composition");
            entity.HasKey(e => e.Id).HasName("recipe_composition__id__PK");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ExternalId).HasColumnName("external_id").IsRequired();
            entity.HasIndex(e => e.ExternalId).IsUnique().HasDatabaseName("recipe_composition__external_id__UIX");
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.HasIndex(e => e.OrganizationId).HasDatabaseName("recipe_composition__organization_id__IX");
            entity.Property(e => e.ParentRecipeId).HasColumnName("parent_recipe_id");
            entity.HasIndex(e => e.ParentRecipeId).HasDatabaseName("recipe_composition__parent_recipe_id__IX");
            entity.Property(e => e.SubRecipeId).HasColumnName("sub_recipe_id");
            entity.Property(e => e.CompositionType).HasColumnName("composition_type").HasMaxLength(50);
            entity.Property(e => e.StepText).HasColumnName("step_text").HasMaxLength(2000);
            entity.Property(e => e.SectionName).HasColumnName("section_name").HasMaxLength(255);
            entity.Property(e => e.SequenceNumber).HasColumnName("sequence_number");
            entity.Property(e => e.Quantity).HasColumnName("quantity").HasPrecision(18, 4);
            entity.Property(e => e.Unit).HasColumnName("unit").HasMaxLength(50);
            entity.Property(e => e.IsDeleted).HasColumnName("is_deleted");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by").HasMaxLength(255);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by").HasMaxLength(255);
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.VersionNbr).HasColumnName("version_nbr");
            entity.HasOne(e => e.ParentRecipe)
                  .WithMany(r => r.Composition)
                  .HasForeignKey(e => e.ParentRecipeId)
                  .HasConstraintName("recipe_detail__recipe_composition_parent__FK");
            entity.HasOne(e => e.SubRecipe)
                  .WithMany()
                  .HasForeignKey(e => e.SubRecipeId)
                  .HasConstraintName("recipe_detail__recipe_composition_sub__FK");
            entity.HasOne(e => e.Organization)
                  .WithMany()
                  .HasForeignKey(e => e.OrganizationId)
                  .HasConstraintName("recipe_composition__organization__FK");
        });

        modelBuilder.Entity<RecipeProduct>(entity =>
        {
            entity.ToTable("recipe_product");
            entity.HasKey(e => e.Id).HasName("recipe_product__id__PK");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ExternalId).HasColumnName("external_id").IsRequired();
            entity.HasIndex(e => e.ExternalId).IsUnique().HasDatabaseName("recipe_product__external_id__UIX");
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.HasIndex(e => e.OrganizationId).HasDatabaseName("recipe_product__organization_id__IX");
            entity.Property(e => e.RecipeId).HasColumnName("recipe_id");
            entity.HasIndex(e => e.RecipeId).HasDatabaseName("recipe_product__recipe_id__IX");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.HasIndex(e => e.ProductId).HasDatabaseName("recipe_product__product_id__IX");
            entity.Property(e => e.IsPrimary).HasColumnName("is_primary");
            entity.Property(e => e.VariationName).HasColumnName("variation_name").HasMaxLength(255);
            entity.Property(e => e.Notes).HasColumnName("notes").HasMaxLength(2000);
            entity.Property(e => e.CreatedBy).HasColumnName("created_by").HasMaxLength(255);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by").HasMaxLength(255);
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.VersionNbr).HasColumnName("version_nbr");
            entity.HasOne(e => e.Recipe)
                  .WithMany(r => r.Products)
                  .HasForeignKey(e => e.RecipeId)
                  .HasConstraintName("recipe_detail__recipe_product__FK");
            entity.HasOne(e => e.Product)
                  .WithMany()
                  .HasForeignKey(e => e.ProductId)
                  .HasConstraintName("sellable_product__recipe_product__FK");
            entity.HasOne(e => e.Organization)
                  .WithMany()
                  .HasForeignKey(e => e.OrganizationId)
                  .HasConstraintName("recipe_product__organization__FK");
        });

        modelBuilder.Entity<FinishedGoodsBatch>(entity =>
        {
            entity.ToTable("finished_goods_batch");
            entity.HasKey(e => e.Id).HasName("finished_goods_batch__id__PK");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ExternalId).HasColumnName("external_id").IsRequired();
            entity.HasIndex(e => e.ExternalId).IsUnique().HasDatabaseName("finished_goods_batch__external_id__UIX");
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.HasIndex(e => e.OrganizationId).HasDatabaseName("finished_goods_batch__organization_id__IX");
            entity.Property(e => e.RecipeId).HasColumnName("recipe_id");
            entity.HasIndex(e => e.RecipeId).HasDatabaseName("finished_goods_batch__recipe_id__IX");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.HasIndex(e => e.ProductId).HasDatabaseName("finished_goods_batch__product_id__IX");
            entity.Property(e => e.QuantityProduced).HasColumnName("quantity_produced");
            entity.Property(e => e.Unit).HasColumnName("unit").HasMaxLength(50);
            entity.Property(e => e.ProductionDate).HasColumnName("production_date");
            entity.Property(e => e.ExpirationDate).HasColumnName("expiration_date");
            entity.Property(e => e.CostPerUnit).HasColumnName("cost_per_unit").HasPrecision(18, 4);
            entity.Property(e => e.BatchNumber).HasColumnName("batch_number").HasMaxLength(50);
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50);
            entity.HasIndex(e => e.Status).HasDatabaseName("finished_goods_batch__status__IX");
            entity.Property(e => e.QuantitySold).HasColumnName("quantity_sold");
            entity.Property(e => e.QuantityWasted).HasColumnName("quantity_wasted");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by").HasMaxLength(255);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by").HasMaxLength(255);
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.VersionNbr).HasColumnName("version_nbr");
            entity.HasOne(e => e.Recipe)
                  .WithMany()
                  .HasForeignKey(e => e.RecipeId)
                  .HasConstraintName("recipe_detail__finished_goods_batch__FK");
            entity.HasOne(e => e.Product)
                  .WithMany()
                  .HasForeignKey(e => e.ProductId)
                  .HasConstraintName("sellable_product__finished_goods_batch__FK");
            entity.HasOne(e => e.Organization)
                  .WithMany()
                  .HasForeignKey(e => e.OrganizationId)
                  .HasConstraintName("finished_goods_batch__organization__FK");
        });

        modelBuilder.Entity<InventoryLot>(entity =>
        {
            entity.ToTable("inventory_lot");
            entity.HasKey(e => e.Id).HasName("inventory_lot__id__PK");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ExternalId).HasColumnName("external_id").IsRequired();
            entity.HasIndex(e => e.ExternalId).IsUnique().HasDatabaseName("inventory_lot__external_id__UIX");
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.HasIndex(e => e.OrganizationId).HasDatabaseName("inventory_lot__organization_id__IX");
            entity.Property(e => e.InventoryItemId).HasColumnName("inventory_item_id");
            entity.HasIndex(e => e.InventoryItemId).HasDatabaseName("inventory_lot__inventory_item_id__IX");
            entity.Property(e => e.PoId).HasColumnName("po_id");
            entity.Property(e => e.InboundFlg).HasColumnName("inbound_flg");
            entity.Property(e => e.ExpectedQuantity).HasColumnName("expected_qty").HasPrecision(18, 4);
            entity.Property(e => e.ExpectedUnitOfMeasure).HasColumnName("expected_unit_of_measure").HasMaxLength(50);
            entity.Property(e => e.ActualQuantity).HasColumnName("actual_qty").HasPrecision(18, 4);
            entity.Property(e => e.ActualUnitOfMeasure).HasColumnName("actual_unit_of_measure").HasMaxLength(50);
            entity.Property(e => e.DiscrepancyReason).HasColumnName("discrepancy_reason").HasMaxLength(255);
            entity.Property(e => e.ExpirationDate).HasColumnName("expiration_date");
            entity.Property(e => e.ReceivedDate).HasColumnName("received_date");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.VersionNbr).HasColumnName("version_nbr");
            entity.HasOne(e => e.Organization)
                  .WithMany()
                  .HasForeignKey(e => e.OrganizationId)
                  .HasConstraintName("organization__inventory_lot__FK");
            entity.HasOne(e => e.InventoryItem)
                  .WithMany(ii => ii.Lots)
                  .HasForeignKey(e => e.InventoryItemId)
                  .HasConstraintName("inventory_item__inventory_lot__FK");
            entity.HasMany(e => e.Movements)
                  .WithOne(im => im.InventoryLot)
                  .HasForeignKey(im => im.InventoryLotId)
                  .OnDelete(DeleteBehavior.SetNull)
                  .HasConstraintName("inventory_lot__inventory_movement__FK");
        });

        modelBuilder.Entity<ProductMovement>(entity =>
        {
            entity.ToTable("product_movement");
            entity.HasKey(e => e.Id).HasName("product_movement__id__PK");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ExternalId).HasColumnName("external_id").IsRequired();
            entity.HasIndex(e => e.ExternalId).IsUnique().HasDatabaseName("product_movement__external_id__UIX");
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.HasIndex(e => e.OrganizationId).HasDatabaseName("product_movement__organization_id__IX");
            entity.Property(e => e.SellableProductId).HasColumnName("sellable_product_id");
            entity.HasIndex(e => e.SellableProductId).HasDatabaseName("product_movement__sellable_product_id__IX");
            entity.Property(e => e.FinishedGoodsBatchId).HasColumnName("finished_goods_batch_id");
            entity.HasIndex(e => e.FinishedGoodsBatchId).HasDatabaseName("product_movement__batch_id__IX");
            entity.Property(e => e.InventoryLotId).HasColumnName("inventory_lot_id");
            entity.HasIndex(e => e.InventoryLotId).HasDatabaseName("product_movement__inventory_lot_id__IX");
            entity.Property(e => e.PoId).HasColumnName("po_id");
            entity.Property(e => e.MovementType).HasColumnName("movement_type").HasMaxLength(50);
            entity.HasIndex(e => e.MovementType).HasDatabaseName("product_movement__movement_type__IX");
            entity.Property(e => e.Quantity).HasColumnName("quantity").HasPrecision(18, 4);
            entity.Property(e => e.UnitOfMeasure).HasColumnName("unit_of_measure").HasMaxLength(50);
            entity.Property(e => e.Reason).HasColumnName("reason").HasMaxLength(255);
            entity.Property(e => e.ReferenceId).HasColumnName("reference_id").HasMaxLength(100);
            entity.Property(e => e.MovementDate).HasColumnName("movement_date");
            entity.HasIndex(e => e.MovementDate).HasDatabaseName("product_movement__movement_date__IX");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.VersionNbr).HasColumnName("version_nbr");
            entity.HasOne(e => e.Organization)
                  .WithMany()
                  .HasForeignKey(e => e.OrganizationId)
                  .HasConstraintName("organization__product_movement__FK");
            entity.HasOne(e => e.SellableProduct)
                  .WithMany()
                  .HasForeignKey(e => e.SellableProductId)
                  .HasConstraintName("sellable_product__product_movement__FK");
            entity.HasOne(e => e.FinishedGoodsBatch)
                  .WithMany()
                  .HasForeignKey(e => e.FinishedGoodsBatchId)
                  .OnDelete(DeleteBehavior.SetNull)
                  .HasConstraintName("finished_goods_batch__product_movement__FK");
            entity.HasOne(e => e.InventoryLot)
                  .WithMany()
                  .HasForeignKey(e => e.InventoryLotId)
                  .OnDelete(DeleteBehavior.SetNull)
                  .HasConstraintName("inventory_lot__product_movement__FK");
        });

        modelBuilder.Entity<WasteEvent>(entity =>
        {
            entity.ToTable("waste_event");
            entity.HasKey(e => e.Id).HasName("waste_event__id__PK");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ExternalId).HasColumnName("external_id").IsRequired();
            entity.HasIndex(e => e.ExternalId).IsUnique().HasDatabaseName("waste_event__external_id__UIX");
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.HasIndex(e => e.OrganizationId).HasDatabaseName("waste_event__organization_id__IX");
            entity.Property(e => e.BatchId).HasColumnName("batch_id");
            entity.HasIndex(e => e.BatchId).HasDatabaseName("waste_event__batch_id__IX");
            entity.Property(e => e.InventoryItemId).HasColumnName("inventory_item_id");
            entity.HasIndex(e => e.InventoryItemId).HasDatabaseName("waste_event__inventory_item_id__IX");
            entity.Property(e => e.QuantityWasted).HasColumnName("quantity_wasted").HasPrecision(18, 4);
            entity.Property(e => e.Unit).HasColumnName("unit").HasMaxLength(50);
            entity.Property(e => e.WasteReason).HasColumnName("waste_reason").HasMaxLength(100);
            entity.HasIndex(e => e.WasteReason).HasDatabaseName("waste_event__reason__IX");
            entity.Property(e => e.WasteCost).HasColumnName("waste_cost").HasPrecision(18, 4);
            entity.Property(e => e.RecordedBy).HasColumnName("recorded_by").HasMaxLength(255);
            entity.Property(e => e.RecordedAt).HasColumnName("recorded_at");
            entity.Property(e => e.Notes).HasColumnName("notes").HasMaxLength(2000);
            entity.Property(e => e.CreatedBy).HasColumnName("created_by").HasMaxLength(255);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by").HasMaxLength(255);
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.VersionNbr).HasColumnName("version_nbr");
            entity.HasOne(e => e.Batch)
                  .WithMany(b => b.WasteEvents)
                  .HasForeignKey(e => e.BatchId)
                  .HasConstraintName("finished_goods_batch__waste_event__FK");
            entity.HasOne(e => e.InventoryItem)
                  .WithMany()
                  .HasForeignKey(e => e.InventoryItemId)
                  .HasConstraintName("inventory_item__waste_event__FK");
            entity.HasOne(e => e.Organization)
                  .WithMany()
                  .HasForeignKey(e => e.OrganizationId)
                  .HasConstraintName("waste_event__organization__FK");
        });
            // Explicit mapping for Terminal entity to existing 'terminal' table
        modelBuilder.Entity<Terminal>(entity =>
        {
            entity.ToTable("terminal");
            entity.HasKey(e => e.TerminalId);
            entity.Property(e => e.TerminalId).HasColumnName("terminal_id");
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.TerminalCode).HasColumnName("terminal_code");
            entity.Property(e => e.Location).HasColumnName("location");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.VersionNbr).HasColumnName("version_nbr");
            entity.Property(e => e.TerminalUid).HasColumnName("terminal_uid");
            // Relationships
            entity.HasOne(e => e.Organization)
                  .WithMany()
                  .HasForeignKey(e => e.OrganizationId);
            entity.HasMany(e => e.SessionLocks)
                  .WithOne(sl => sl.Terminal)
                  .HasForeignKey(sl => sl.TerminalId);
            entity.HasMany(e => e.DeviceBindings)
                  .WithOne(db => db.Terminal)
                  .HasForeignKey(db => db.TerminalId);
        });

        // Explicit mapping for TerminalDeviceBinding entity
        modelBuilder.Entity<TerminalDeviceBinding>(entity =>
        {
            entity.ToTable("terminal_device_binding");
            entity.HasKey(e => e.TerminalDeviceBindingId);
            entity.Property(e => e.TerminalDeviceBindingId).HasColumnName("terminal_device_binding_id");
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.TerminalId).HasColumnName("terminal_id");
            entity.Property(e => e.DeviceToken).HasColumnName("device_token");
            entity.Property(e => e.BoundByUserId).HasColumnName("bound_by_user_id");
            entity.Property(e => e.BoundAt)
                  .HasColumnName("bound_at")
                  .HasConversion(v => v == null ? null : (v.Value.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)),
                                 v => v == null ? null : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc));
            entity.Property(e => e.LastSeenAt)
                  .HasColumnName("last_seen_at")
                  .HasConversion(v => v.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v, DateTimeKind.Utc),
                                 v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
            entity.Property(e => e.UnboundAt)
                  .HasColumnName("unbound_at")
                  .HasConversion(v => v == null ? null : (v.Value.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)),
                                 v => v == null ? null : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc));
            entity.Property(e => e.UnboundByUserId).HasColumnName("unbound_by_user_id");
            entity.Property(e => e.SessionId).HasColumnName("session_id");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt)
                  .HasColumnName("created_at")
                  .HasConversion(v => v.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v, DateTimeKind.Utc),
                                 v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
            entity.Property(e => e.UpdatedAt)
                  .HasColumnName("updated_at")
                  .HasConversion(v => v.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v, DateTimeKind.Utc),
                                 v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
            
            // Indexes
            entity.HasIndex(e => new { e.OrganizationId, e.DeviceToken }).HasDatabaseName("idx_terminal_device_binding_org_token");
            entity.HasIndex(e => new { e.OrganizationId, e.TerminalId, e.IsActive }).HasDatabaseName("idx_terminal_device_binding_org_terminal_active");
            
            // Relationships
            entity.HasOne(e => e.Organization)
                  .WithMany()
                  .HasForeignKey(e => e.OrganizationId);
            entity.HasOne(e => e.Terminal)
                  .WithMany(t => t.DeviceBindings)
                  .HasForeignKey(e => e.TerminalId);
        });

        // Explicit mapping for TerminalSessionLock entity
        modelBuilder.Entity<TerminalSessionLock>(entity =>
        {
            entity.ToTable("terminal_session_lock");
            entity.HasKey(e => e.TerminalSessionLockId);
            entity.Property(e => e.TerminalSessionLockId).HasColumnName("terminal_session_lock_id");
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.TerminalId).HasColumnName("terminal_id");
            entity.Property(e => e.LockedAt)
                  .HasColumnName("locked_at")
                  .HasConversion(v => v == null ? null : (v.Value.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)),
                                 v => v == null ? null : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc));
            entity.Property(e => e.SessionBeginOn)
                  .HasColumnName("session_begin_at")
                  .HasConversion(v => v == null ? null : (v.Value.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)),
                                 v => v == null ? null : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc));
            entity.Property(e => e.SessionEndOn)
                  .HasColumnName("session_end_at")
                  .HasConversion(v => v == null ? null : (v.Value.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)),
                                 v => v == null ? null : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc));
            entity.Property(e => e.LockedByUserId).HasColumnName("locked_by_user_id");
            entity.Property(e => e.StatusCd).HasColumnName("status_cd");
            entity.Property(e => e.CreatedAt)
                  .HasColumnName("created_at")
                  .HasConversion(v => v.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v, DateTimeKind.Utc),
                                 v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
            entity.Property(e => e.LastActivityOn)
                  .HasColumnName("last_activity_at")
                  .HasConversion(v => v == null ? null : (v.Value.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)),
                                 v => v == null ? null : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc));
            // Relationships
            entity.HasOne(e => e.Terminal)
                  .WithMany(t => t.SessionLocks)
                  .HasForeignKey(e => e.TerminalId);
        });

        // Explicit mapping for OrganizationSetting entity
        modelBuilder.Entity<OrganizationSetting>(entity =>
        {
            entity.ToTable("organization_setting");
            entity.HasKey(e => e.OrganizationSettingId);
            entity.Property(e => e.OrganizationSettingId).HasColumnName("organization_setting_id");
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.SettingKey).HasColumnName("setting_key");
            entity.Property(e => e.SettingValue).HasColumnName("setting_value");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.VersionNbr).HasColumnName("version_nbr");
            // Relationships
            entity.HasOne(e => e.Organization)
                  .WithMany()
                  .HasForeignKey(e => e.OrganizationId);
        });

        modelBuilder.Entity<UnitConversion>(entity =>
        {
            entity.ToTable("unit_conversion");
            entity.HasKey(e => e.UnitConversionId);
            entity.Property(e => e.UnitConversionId).HasColumnName("unit_conversion_id");
                  entity.Property(e => e.ExternalId).HasColumnName("external_id");
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.FromUnit).HasColumnName("from_unit");
            entity.Property(e => e.ToUnit).HasColumnName("to_unit");
            entity.Property(e => e.ConversionFactor).HasColumnName("conversion_factor").HasPrecision(18, 8);
            entity.Property(e => e.Category).HasColumnName("category");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by");
            entity.Property(e => e.VersionNbr).HasColumnName("version_nbr");

            entity.HasIndex(e => e.ExternalId)
                  .IsUnique()
                  .HasDatabaseName("unit_conversion__external_id__UIX");

            entity.HasIndex(e => new { e.OrganizationId, e.FromUnit, e.ToUnit })
                  .IsUnique()
                  .HasDatabaseName("unit_conversion__organization_id_from_unit_to_unit__UIX");
        });
        
        // Note: Optimistic locking handled manually in service layer via UpdateWithVersionCheckAsync
        // EF Core auto-configuration conflicts with custom table naming (organization vs Organizations)
      }
}