using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PreOrderApp.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderInventoryProductsWithVersionControl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LicenseSubscription_Organization_OrganizationId",
                table: "LicenseSubscription");

            migrationBuilder.DropForeignKey(
                name: "FK_Order_Organization_OrganizationId",
                table: "Order");

            migrationBuilder.DropForeignKey(
                name: "FK_SystemUser_Organization_OrganizationId",
                table: "SystemUser");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Organization",
                table: "Organization");

            migrationBuilder.DropPrimaryKey(
                name: "PK_SystemUser",
                table: "SystemUser");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Order",
                table: "Order");

            migrationBuilder.DropPrimaryKey(
                name: "PK_LicenseSubscription",
                table: "LicenseSubscription");

            migrationBuilder.RenameTable(
                name: "Organization",
                newName: "organization");

            migrationBuilder.RenameTable(
                name: "SystemUser",
                newName: "system_user");

            migrationBuilder.RenameTable(
                name: "Order",
                newName: "customer_order");

            migrationBuilder.RenameTable(
                name: "LicenseSubscription",
                newName: "license_subscription");

            migrationBuilder.RenameColumn(
                name: "Region",
                table: "organization",
                newName: "region");

            migrationBuilder.RenameColumn(
                name: "Locality",
                table: "organization",
                newName: "locality");

            migrationBuilder.RenameColumn(
                name: "RegistrationToken",
                table: "organization",
                newName: "registration_token");

            migrationBuilder.RenameColumn(
                name: "PrimaryEmail",
                table: "organization",
                newName: "primary_email");

            migrationBuilder.RenameColumn(
                name: "PostalCode",
                table: "organization",
                newName: "postal_code");

            migrationBuilder.RenameColumn(
                name: "OrganizationName",
                table: "organization",
                newName: "organization_name");

            migrationBuilder.RenameColumn(
                name: "ModifiedOn",
                table: "organization",
                newName: "modified_on");

            migrationBuilder.RenameColumn(
                name: "IsEnabled",
                table: "organization",
                newName: "is_enabled");

            migrationBuilder.RenameColumn(
                name: "CreatedOn",
                table: "organization",
                newName: "created_on");

            migrationBuilder.RenameColumn(
                name: "CountryCode",
                table: "organization",
                newName: "country_code");

            migrationBuilder.RenameColumn(
                name: "AddressLine3",
                table: "organization",
                newName: "address_line3");

            migrationBuilder.RenameColumn(
                name: "AddressLine2",
                table: "organization",
                newName: "address_line2");

            migrationBuilder.RenameColumn(
                name: "AddressLine1",
                table: "organization",
                newName: "address_line1");

            migrationBuilder.RenameColumn(
                name: "OrganizationId",
                table: "organization",
                newName: "organization_id");

            migrationBuilder.RenameIndex(
                name: "IX_Organization_RegistrationToken",
                table: "organization",
                newName: "ix_organization_registration_token");

            migrationBuilder.RenameIndex(
                name: "IX_Organization_PrimaryEmail",
                table: "organization",
                newName: "ix_organization_primary_email");

            migrationBuilder.RenameColumn(
                name: "Username",
                table: "system_user",
                newName: "user_name");

            migrationBuilder.RenameColumn(
                name: "UserRole",
                table: "system_user",
                newName: "user_role");

            migrationBuilder.RenameColumn(
                name: "PasswordHash",
                table: "system_user",
                newName: "password_hash");

            migrationBuilder.RenameColumn(
                name: "OrganizationId",
                table: "system_user",
                newName: "organization_id");

            migrationBuilder.RenameColumn(
                name: "LastName",
                table: "system_user",
                newName: "last_name");

            migrationBuilder.RenameColumn(
                name: "LastLoginOn",
                table: "system_user",
                newName: "last_login_on");

            migrationBuilder.RenameColumn(
                name: "IsEnabled",
                table: "system_user",
                newName: "is_enabled");

            migrationBuilder.RenameColumn(
                name: "FirstName",
                table: "system_user",
                newName: "first_name");

            migrationBuilder.RenameColumn(
                name: "EmailAddress",
                table: "system_user",
                newName: "email_address");

            migrationBuilder.RenameColumn(
                name: "CreatedOn",
                table: "system_user",
                newName: "created_on");

            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "system_user",
                newName: "user_id");

            migrationBuilder.RenameIndex(
                name: "IX_SystemUser_OrganizationId",
                table: "system_user",
                newName: "ix_systemuser_organizationid");

            migrationBuilder.RenameIndex(
                name: "IX_SystemUser_EmailAddress",
                table: "system_user",
                newName: "ix_systemuser_emailaddress");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "customer_order",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "OrganizationId",
                table: "customer_order",
                newName: "organization_id");

            migrationBuilder.RenameColumn(
                name: "OrderDate",
                table: "customer_order",
                newName: "order_date");

            migrationBuilder.RenameColumn(
                name: "CustomerName",
                table: "customer_order",
                newName: "customer_name");

            migrationBuilder.RenameIndex(
                name: "IX_Order_OrganizationId",
                table: "customer_order",
                newName: "ix_customer_order_organization_id");

            migrationBuilder.RenameColumn(
                name: "Tier",
                table: "license_subscription",
                newName: "tier");

            migrationBuilder.RenameColumn(
                name: "StartDate",
                table: "license_subscription",
                newName: "start_date");

            migrationBuilder.RenameColumn(
                name: "ReferralCode",
                table: "license_subscription",
                newName: "referral_code");

            migrationBuilder.RenameColumn(
                name: "OrganizationId",
                table: "license_subscription",
                newName: "organization_id");

            migrationBuilder.RenameColumn(
                name: "ModifiedOn",
                table: "license_subscription",
                newName: "modified_on");

            migrationBuilder.RenameColumn(
                name: "IsActive",
                table: "license_subscription",
                newName: "is_active");

            migrationBuilder.RenameColumn(
                name: "EndDate",
                table: "license_subscription",
                newName: "end_date");

            migrationBuilder.RenameColumn(
                name: "CreatedOn",
                table: "license_subscription",
                newName: "created_on");

            migrationBuilder.RenameColumn(
                name: "SubscriptionId",
                table: "license_subscription",
                newName: "subscription_id");

            migrationBuilder.RenameIndex(
                name: "IX_LicenseSubscription_OrganizationId",
                table: "license_subscription",
                newName: "ix_licensesubscription_organizationid");

            migrationBuilder.AddColumn<string>(
                name: "contact_phone",
                table: "organization",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "hash_salt",
                table: "organization",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "pin_attempts",
                table: "system_user",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "pin_hash",
                table: "system_user",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "pin_locked_until",
                table: "system_user",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "pin_set_on",
                table: "system_user",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "created_at",
                table: "customer_order",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<Guid>(
                name: "created_by",
                table: "customer_order",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "customer_email",
                table: "customer_order",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "delivery_date",
                table: "customer_order",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "order_number",
                table: "customer_order",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "order_status",
                table: "customer_order",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "special_instructions",
                table: "customer_order",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "total_amount",
                table: "customer_order",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                table: "customer_order",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<Guid>(
                name: "updated_by",
                table: "customer_order",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "version_nbr",
                table: "customer_order",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "identity_hash",
                table: "license_subscription",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddPrimaryKey(
                name: "PK_organization",
                table: "organization",
                column: "organization_id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_system_user",
                table: "system_user",
                column: "user_id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_customer_order",
                table: "customer_order",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_license_subscription",
                table: "license_subscription",
                column: "subscription_id");

            migrationBuilder.CreateTable(
                name: "audit_log",
                columns: table => new
                {
                    log_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: true),
                    action = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    entity_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    entity_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    details = table.Column<string>(type: "text", nullable: true),
                    ip_address = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    user_agent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_log", x => x.log_id);
                    table.ForeignKey(
                        name: "FK_audit_log_organization_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organization",
                        principalColumn: "organization_id");
                    table.ForeignKey(
                        name: "FK_audit_log_system_user_user_id",
                        column: x => x.user_id,
                        principalTable: "system_user",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "product",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    sku = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    unit_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    cost_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    version_nbr = table.Column<int>(type: "integer", nullable: false, defaultValue: 1)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product", x => x.id);
                    table.ForeignKey(
                        name: "FK_product_organization_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organization",
                        principalColumn: "organization_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "registration_code",
                columns: table => new
                {
                    code_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    registration_code = table.Column<string>(type: "text", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "text", nullable: true),
                    user_role = table.Column<string>(type: "text", nullable: false),
                    expires_on = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_used = table.Column<bool>(type: "boolean", nullable: false),
                    used_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    used_on = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_on = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_registration_code", x => x.code_id);
                    table.ForeignKey(
                        name: "FK_registration_code_organization_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organization",
                        principalColumn: "organization_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_registration_code_system_user_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "system_user",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_registration_code_system_user_used_by_user_id",
                        column: x => x.used_by_user_id,
                        principalTable: "system_user",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "user_session",
                columns: table => new
                {
                    session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    session_token = table.Column<string>(type: "text", nullable: false),
                    ip_address = table.Column<string>(type: "text", nullable: true),
                    user_agent = table.Column<string>(type: "text", nullable: true),
                    created_on = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_accessed_on = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expires_on = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_session", x => x.session_id);
                    table.ForeignKey(
                        name: "FK_user_session_system_user_user_id",
                        column: x => x.user_id,
                        principalTable: "system_user",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "inventory_item",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_id = table.Column<Guid>(type: "uuid", nullable: false),
                    warehouse_location = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    quantity_on_hand = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    quantity_reserved = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    unit_of_measure = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    batch_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    expiration_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_received_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_used_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    version_nbr = table.Column<int>(type: "integer", nullable: false, defaultValue: 1)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inventory_item", x => x.id);
                    table.ForeignKey(
                        name: "FK_inventory_item_organization_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organization",
                        principalColumn: "organization_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_inventory_item_product_product_id",
                        column: x => x.product_id,
                        principalTable: "product",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "order_item",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    line_total = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    customizations = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    version_nbr = table.Column<int>(type: "integer", nullable: false, defaultValue: 1)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_item", x => x.id);
                    table.ForeignKey(
                        name: "FK_order_item_customer_order_order_id",
                        column: x => x.order_id,
                        principalTable: "customer_order",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_order_item_product_product_id",
                        column: x => x.product_id,
                        principalTable: "product",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "inventory_movement",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    inventory_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    movement_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    quantity_change = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    reason = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    reference_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    version_nbr = table.Column<int>(type: "integer", nullable: false, defaultValue: 1)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inventory_movement", x => x.id);
                    table.ForeignKey(
                        name: "FK_inventory_movement_inventory_item_inventory_item_id",
                        column: x => x.inventory_item_id,
                        principalTable: "inventory_item",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_inventory_movement_organization_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organization",
                        principalColumn: "organization_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_systemuser_username",
                table: "system_user",
                column: "user_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_customer_order_order_number",
                table: "customer_order",
                column: "order_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_licensesubscription_isactive",
                table: "license_subscription",
                column: "is_active");

            migrationBuilder.CreateIndex(
                name: "IX_audit_log_organization_id",
                table: "audit_log",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_audit_log_user_id",
                table: "audit_log",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_inventory_item_organization_id",
                table: "inventory_item",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "ix_inventory_item_product_id",
                table: "inventory_item",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "ix_inventory_movement_inventory_item_id",
                table: "inventory_movement",
                column: "inventory_item_id");

            migrationBuilder.CreateIndex(
                name: "ix_inventory_movement_organization_id",
                table: "inventory_movement",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "ix_order_item_order_id",
                table: "order_item",
                column: "order_id");

            migrationBuilder.CreateIndex(
                name: "ix_order_item_product_id",
                table: "order_item",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "ix_product_organization_id",
                table: "product",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "ix_product_sku",
                table: "product",
                column: "sku",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_registration_code_created_by_user_id",
                table: "registration_code",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_registration_code_used_by_user_id",
                table: "registration_code",
                column: "used_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_registrationcode_organizationid",
                table: "registration_code",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "ix_registrationcode_registrationcode",
                table: "registration_code",
                column: "registration_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_usersession_sessiontoken",
                table: "user_session",
                column: "session_token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_usersession_userid",
                table: "user_session",
                column: "user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_customer_order_organization_organization_id",
                table: "customer_order",
                column: "organization_id",
                principalTable: "organization",
                principalColumn: "organization_id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_license_subscription_organization_organization_id",
                table: "license_subscription",
                column: "organization_id",
                principalTable: "organization",
                principalColumn: "organization_id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_system_user_organization_organization_id",
                table: "system_user",
                column: "organization_id",
                principalTable: "organization",
                principalColumn: "organization_id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_customer_order_organization_organization_id",
                table: "customer_order");

            migrationBuilder.DropForeignKey(
                name: "FK_license_subscription_organization_organization_id",
                table: "license_subscription");

            migrationBuilder.DropForeignKey(
                name: "FK_system_user_organization_organization_id",
                table: "system_user");

            migrationBuilder.DropTable(
                name: "audit_log");

            migrationBuilder.DropTable(
                name: "inventory_movement");

            migrationBuilder.DropTable(
                name: "order_item");

            migrationBuilder.DropTable(
                name: "registration_code");

            migrationBuilder.DropTable(
                name: "user_session");

            migrationBuilder.DropTable(
                name: "inventory_item");

            migrationBuilder.DropTable(
                name: "product");

            migrationBuilder.DropPrimaryKey(
                name: "PK_organization",
                table: "organization");

            migrationBuilder.DropPrimaryKey(
                name: "PK_system_user",
                table: "system_user");

            migrationBuilder.DropIndex(
                name: "ix_systemuser_username",
                table: "system_user");

            migrationBuilder.DropPrimaryKey(
                name: "PK_license_subscription",
                table: "license_subscription");

            migrationBuilder.DropIndex(
                name: "ix_licensesubscription_isactive",
                table: "license_subscription");

            migrationBuilder.DropPrimaryKey(
                name: "PK_customer_order",
                table: "customer_order");

            migrationBuilder.DropIndex(
                name: "ix_customer_order_order_number",
                table: "customer_order");

            migrationBuilder.DropColumn(
                name: "contact_phone",
                table: "organization");

            migrationBuilder.DropColumn(
                name: "hash_salt",
                table: "organization");

            migrationBuilder.DropColumn(
                name: "pin_attempts",
                table: "system_user");

            migrationBuilder.DropColumn(
                name: "pin_hash",
                table: "system_user");

            migrationBuilder.DropColumn(
                name: "pin_locked_until",
                table: "system_user");

            migrationBuilder.DropColumn(
                name: "pin_set_on",
                table: "system_user");

            migrationBuilder.DropColumn(
                name: "identity_hash",
                table: "license_subscription");

            migrationBuilder.DropColumn(
                name: "created_at",
                table: "customer_order");

            migrationBuilder.DropColumn(
                name: "created_by",
                table: "customer_order");

            migrationBuilder.DropColumn(
                name: "customer_email",
                table: "customer_order");

            migrationBuilder.DropColumn(
                name: "delivery_date",
                table: "customer_order");

            migrationBuilder.DropColumn(
                name: "order_number",
                table: "customer_order");

            migrationBuilder.DropColumn(
                name: "order_status",
                table: "customer_order");

            migrationBuilder.DropColumn(
                name: "special_instructions",
                table: "customer_order");

            migrationBuilder.DropColumn(
                name: "total_amount",
                table: "customer_order");

            migrationBuilder.DropColumn(
                name: "updated_at",
                table: "customer_order");

            migrationBuilder.DropColumn(
                name: "updated_by",
                table: "customer_order");

            migrationBuilder.RenameTable(
                name: "organization",
                newName: "Organization");

            migrationBuilder.RenameTable(
                name: "system_user",
                newName: "SystemUser");

            migrationBuilder.RenameTable(
                name: "license_subscription",
                newName: "LicenseSubscription");

            migrationBuilder.RenameTable(
                name: "customer_order",
                newName: "Order");

            migrationBuilder.RenameColumn(
                name: "region",
                table: "Organization",
                newName: "Region");

            migrationBuilder.RenameColumn(
                name: "locality",
                table: "Organization",
                newName: "Locality");

            migrationBuilder.RenameColumn(
                name: "registration_token",
                table: "Organization",
                newName: "RegistrationToken");

            migrationBuilder.RenameColumn(
                name: "primary_email",
                table: "Organization",
                newName: "PrimaryEmail");

            migrationBuilder.RenameColumn(
                name: "postal_code",
                table: "Organization",
                newName: "PostalCode");

            migrationBuilder.RenameColumn(
                name: "organization_name",
                table: "Organization",
                newName: "OrganizationName");

            migrationBuilder.RenameColumn(
                name: "modified_on",
                table: "Organization",
                newName: "ModifiedOn");

            migrationBuilder.RenameColumn(
                name: "is_enabled",
                table: "Organization",
                newName: "IsEnabled");

            migrationBuilder.RenameColumn(
                name: "created_on",
                table: "Organization",
                newName: "CreatedOn");

            migrationBuilder.RenameColumn(
                name: "country_code",
                table: "Organization",
                newName: "CountryCode");

            migrationBuilder.RenameColumn(
                name: "address_line3",
                table: "Organization",
                newName: "AddressLine3");

            migrationBuilder.RenameColumn(
                name: "address_line2",
                table: "Organization",
                newName: "AddressLine2");

            migrationBuilder.RenameColumn(
                name: "address_line1",
                table: "Organization",
                newName: "AddressLine1");

            migrationBuilder.RenameColumn(
                name: "organization_id",
                table: "Organization",
                newName: "OrganizationId");

            migrationBuilder.RenameIndex(
                name: "ix_organization_registration_token",
                table: "Organization",
                newName: "IX_Organization_RegistrationToken");

            migrationBuilder.RenameIndex(
                name: "ix_organization_primary_email",
                table: "Organization",
                newName: "IX_Organization_PrimaryEmail");

            migrationBuilder.RenameColumn(
                name: "user_role",
                table: "SystemUser",
                newName: "UserRole");

            migrationBuilder.RenameColumn(
                name: "user_name",
                table: "SystemUser",
                newName: "Username");

            migrationBuilder.RenameColumn(
                name: "password_hash",
                table: "SystemUser",
                newName: "PasswordHash");

            migrationBuilder.RenameColumn(
                name: "organization_id",
                table: "SystemUser",
                newName: "OrganizationId");

            migrationBuilder.RenameColumn(
                name: "last_name",
                table: "SystemUser",
                newName: "LastName");

            migrationBuilder.RenameColumn(
                name: "last_login_on",
                table: "SystemUser",
                newName: "LastLoginOn");

            migrationBuilder.RenameColumn(
                name: "is_enabled",
                table: "SystemUser",
                newName: "IsEnabled");

            migrationBuilder.RenameColumn(
                name: "first_name",
                table: "SystemUser",
                newName: "FirstName");

            migrationBuilder.RenameColumn(
                name: "email_address",
                table: "SystemUser",
                newName: "EmailAddress");

            migrationBuilder.RenameColumn(
                name: "created_on",
                table: "SystemUser",
                newName: "CreatedOn");

            migrationBuilder.RenameColumn(
                name: "user_id",
                table: "SystemUser",
                newName: "UserId");

            migrationBuilder.RenameIndex(
                name: "ix_systemuser_organizationid",
                table: "SystemUser",
                newName: "IX_SystemUser_OrganizationId");

            migrationBuilder.RenameIndex(
                name: "ix_systemuser_emailaddress",
                table: "SystemUser",
                newName: "IX_SystemUser_EmailAddress");

            migrationBuilder.RenameColumn(
                name: "tier",
                table: "LicenseSubscription",
                newName: "Tier");

            migrationBuilder.RenameColumn(
                name: "start_date",
                table: "LicenseSubscription",
                newName: "StartDate");

            migrationBuilder.RenameColumn(
                name: "referral_code",
                table: "LicenseSubscription",
                newName: "ReferralCode");

            migrationBuilder.RenameColumn(
                name: "organization_id",
                table: "LicenseSubscription",
                newName: "OrganizationId");

            migrationBuilder.RenameColumn(
                name: "modified_on",
                table: "LicenseSubscription",
                newName: "ModifiedOn");

            migrationBuilder.RenameColumn(
                name: "is_active",
                table: "LicenseSubscription",
                newName: "IsActive");

            migrationBuilder.RenameColumn(
                name: "end_date",
                table: "LicenseSubscription",
                newName: "EndDate");

            migrationBuilder.RenameColumn(
                name: "created_on",
                table: "LicenseSubscription",
                newName: "CreatedOn");

            migrationBuilder.RenameColumn(
                name: "subscription_id",
                table: "LicenseSubscription",
                newName: "SubscriptionId");

            migrationBuilder.RenameIndex(
                name: "ix_licensesubscription_organizationid",
                table: "LicenseSubscription",
                newName: "IX_LicenseSubscription_OrganizationId");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "Order",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "organization_id",
                table: "Order",
                newName: "OrganizationId");

            migrationBuilder.RenameColumn(
                name: "order_date",
                table: "Order",
                newName: "OrderDate");

            migrationBuilder.RenameColumn(
                name: "customer_name",
                table: "Order",
                newName: "CustomerName");

            migrationBuilder.RenameIndex(
                name: "ix_customer_order_organization_id",
                table: "Order",
                newName: "IX_Order_OrganizationId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Organization",
                table: "Organization",
                column: "OrganizationId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_SystemUser",
                table: "SystemUser",
                column: "UserId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_LicenseSubscription",
                table: "LicenseSubscription",
                column: "SubscriptionId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Order",
                table: "Order",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_LicenseSubscription_Organization_OrganizationId",
                table: "LicenseSubscription",
                column: "OrganizationId",
                principalTable: "Organization",
                principalColumn: "OrganizationId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Order_Organization_OrganizationId",
                table: "Order",
                column: "OrganizationId",
                principalTable: "Organization",
                principalColumn: "OrganizationId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SystemUser_Organization_OrganizationId",
                table: "SystemUser",
                column: "OrganizationId",
                principalTable: "Organization",
                principalColumn: "OrganizationId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
