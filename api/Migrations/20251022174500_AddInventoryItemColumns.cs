using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderMgmt.Migrations
{
    /// <inheritdoc />
    public partial class AddInventoryItemColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add missing columns for inventory_item
            migrationBuilder.AddColumn<string>(
                name: "name",
                table: "inventory_item",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "description",
                table: "inventory_item",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "sku",
                table: "inventory_item",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "unit_cost",
                table: "inventory_item",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<Guid>(
                name: "created_by",
                table: "inventory_item",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "updated_by",
                table: "inventory_item",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "name",
                table: "inventory_item");

            migrationBuilder.DropColumn(
                name: "description",
                table: "inventory_item");

            migrationBuilder.DropColumn(
                name: "sku",
                table: "inventory_item");

            migrationBuilder.DropColumn(
                name: "unit_cost",
                table: "inventory_item");

            migrationBuilder.DropColumn(
                name: "created_by",
                table: "inventory_item");

            migrationBuilder.DropColumn(
                name: "updated_by",
                table: "inventory_item");
        }
    }
}
