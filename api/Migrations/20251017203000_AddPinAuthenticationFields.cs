using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PreOrderApp.Migrations
{
    /// <inheritdoc />
    public partial class AddPinAuthenticationFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "pin_hash",
                table: "system_user",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "pin_attempts",
                table: "system_user",
                type: "integer",
                nullable: false,
                defaultValue: 0);

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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "pin_hash",
                table: "system_user");

            migrationBuilder.DropColumn(
                name: "pin_attempts",
                table: "system_user");

            migrationBuilder.DropColumn(
                name: "pin_locked_until",
                table: "system_user");

            migrationBuilder.DropColumn(
                name: "pin_set_on",
                table: "system_user");
        }
    }
}
