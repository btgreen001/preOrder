using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PreOrderApp.Migrations
{
    /// <inheritdoc />
    public partial class UpdateCustomerOrderSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Create the customer table
            migrationBuilder.CreateTable(
                name: "customer",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    address = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    city = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    state = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    zip_code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    version_nbr = table.Column<int>(type: "integer", nullable: false, defaultValue: 1)
                },
                constraints: table =>
                {
                    table.PrimaryKey("customer__id__PK", x => x.id);
                    table.ForeignKey(
                        name: "organization__customer__FK",
                        column: x => x.organization_id,
                        principalTable: "organization",
                        principalColumn: "organization_id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Create index on organization_id for customer table
            migrationBuilder.CreateIndex(
                name: "customer__organization_id__IX",
                table: "customer",
                column: "organization_id");

            // Drop the existing customer_order table constraints and columns
            migrationBuilder.DropForeignKey(
                name: "customer_order_organization_id_fkey",
                table: "customer_order");

            migrationBuilder.DropColumn(
                name: "customer_name",
                table: "customer_order");

            // Add new columns to customer_order
            migrationBuilder.AddColumn<Guid>(
                name: "customer_id",
                table: "customer_order",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "delivery_id",
                table: "customer_order",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "order_status",
                table: "customer_order",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "PENDING");

            migrationBuilder.AddColumn<decimal>(
                name: "total_amount",
                table: "customer_order",
                type: "numeric(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "special_instruction_txt",
                table: "customer_order",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "created_by",
                table: "customer_order",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "updated_by",
                table: "customer_order",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "created_at",
                table: "customer_order",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2025, 10, 19, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                table: "customer_order",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2025, 10, 19, 0, 0, 0, 0, DateTimeKind.Utc));

            migrationBuilder.AddColumn<int>(
                name: "version_nbr",
                table: "customer_order",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            // Drop the old order_date column and recreate the table structure properly
            // First rename order_date temporarily
            migrationBuilder.RenameColumn(
                name: "order_date",
                table: "customer_order",
                newName: "order_date_temp");

            // Add order_date back as NOT NULL with default
            migrationBuilder.AddColumn<DateTime>(
                name: "order_date",
                table: "customer_order",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2025, 10, 19, 0, 0, 0, 0, DateTimeKind.Utc));

            // Copy data from temp column and drop it
            migrationBuilder.Sql("UPDATE customer_order SET order_date = order_date_temp WHERE order_date_temp IS NOT NULL");
            migrationBuilder.DropColumn(
                name: "order_date_temp",
                table: "customer_order");

            // Add the foreign key constraint for customer_id
            migrationBuilder.AddForeignKey(
                name: "organization__customer_order__FK",
                table: "customer_order",
                column: "organization_id",
                principalTable: "organization",
                principalColumn: "organization_id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "customer__customer_order__FK",
                table: "customer_order",
                column: "customer_id",
                principalTable: "customer",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            // Create indexes
            migrationBuilder.CreateIndex(
                name: "customer_order__organization_id__IX",
                table: "customer_order",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "customer_order__customer_id__IX",
                table: "customer_order",
                column: "customer_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop the new indexes and constraints
            migrationBuilder.DropForeignKey(
                name: "customer__customer_order__FK",
                table: "customer_order");

            migrationBuilder.DropForeignKey(
                name: "organization__customer_order__FK",
                table: "customer_order");

            migrationBuilder.DropIndex(
                name: "customer_order__customer_id__IX",
                table: "customer_order");

            migrationBuilder.DropIndex(
                name: "customer_order__organization_id__IX",
                table: "customer_order");

            // Drop the customer table and its indexes
            migrationBuilder.DropTable(
                name: "customer");

            // Revert customer_order table changes
            migrationBuilder.DropColumn(
                name: "version_nbr",
                table: "customer_order");

            migrationBuilder.DropColumn(
                name: "updated_at",
                table: "customer_order");

            migrationBuilder.DropColumn(
                name: "created_at",
                table: "customer_order");

            migrationBuilder.DropColumn(
                name: "updated_by",
                table: "customer_order");

            migrationBuilder.DropColumn(
                name: "created_by",
                table: "customer_order");

            migrationBuilder.DropColumn(
                name: "special_instruction_txt",
                table: "customer_order");

            migrationBuilder.DropColumn(
                name: "total_amount",
                table: "customer_order");

            migrationBuilder.DropColumn(
                name: "order_status",
                table: "customer_order");

            migrationBuilder.DropColumn(
                name: "delivery_id",
                table: "customer_order");

            migrationBuilder.DropColumn(
                name: "customer_id",
                table: "customer_order");

            // Re-add the customer_name column
            migrationBuilder.AddColumn<string>(
                name: "customer_name",
                table: "customer_order",
                type: "character varying(255)",
                nullable: true);

            // Restore the original foreign key
            migrationBuilder.AddForeignKey(
                name: "customer_order_organization_id_fkey",
                table: "customer_order",
                column: "organization_id",
                principalTable: "organization",
                principalColumn: "organization_id");
        }
    }
}
