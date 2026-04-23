using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderMgmt.Migrations
{
    /// <inheritdoc />
    public partial class FixIsEnabledBoolean : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "UserName",
                table: "SystemUser",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

                migrationBuilder.AlterColumn<string>(
                    name: "UserRole",
                    table: "SystemUser",
                    type: "text",
                    nullable: false,
                    oldClrType: typeof(string),
                    oldType: "TEXT");

                migrationBuilder.AlterColumn<string>(
                    name: "PasswordHash",
                    table: "SystemUser",
                    type: "text",
                    nullable: false,
                    oldClrType: typeof(string),
                    oldType: "TEXT");

                migrationBuilder.AlterColumn<Guid>(
                    name: "OrganizationId",
                    table: "SystemUser",
                    type: "uuid",
                    nullable: false,
                    oldClrType: typeof(string),
                    oldType: "TEXT");

                migrationBuilder.AlterColumn<string>(
                    name: "LastName",
                    table: "SystemUser",
                    type: "text",
                    nullable: false,
                    oldClrType: typeof(string),
                    oldType: "TEXT");

                migrationBuilder.AlterColumn<DateTime>(
                    name: "LastLoginOn",
                    table: "SystemUser",
                    type: "timestamp with time zone",
                    nullable: true,
                    oldClrType: typeof(string),
                    oldType: "TEXT",
                    oldNullable: true);

                migrationBuilder.AlterColumn<bool>(
                    name: "IsEnabled",
                    table: "SystemUser",
                    type: "boolean",
                    nullable: false,
                    oldClrType: typeof(int),
                    oldType: "INTEGER");

                migrationBuilder.AlterColumn<string>(
                    name: "FirstName",
                    table: "SystemUser",
                    type: "text",
                    nullable: false,
                    oldClrType: typeof(string),
                    oldType: "TEXT");

                migrationBuilder.AlterColumn<string>(
                    name: "EmailAddress",
                    table: "SystemUser",
                    type: "text",
                    nullable: false,
                    oldClrType: typeof(string),
                    oldType: "TEXT");

                migrationBuilder.AlterColumn<DateTime>(
                    name: "CreatedOn",
                    table: "SystemUser",
                    type: "timestamp with time zone",
                    nullable: false,
                    oldClrType: typeof(string),
                    oldType: "TEXT");

                migrationBuilder.AlterColumn<Guid>(
                    name: "UserId",
                    table: "SystemUser",
                    type: "uuid",
                    nullable: false,
                    oldClrType: typeof(string),
                    oldType: "TEXT");

                migrationBuilder.AlterColumn<string>(
                    name: "RegistrationToken",
                    table: "Organization",
                    type: "text",
                    nullable: true,
                    oldClrType: typeof(string),
                    oldType: "TEXT",
                    oldNullable: true);

                migrationBuilder.AlterColumn<string>(
                    name: "Region",
                    table: "Organization",
                    type: "text",
                    nullable: true,
                    oldClrType: typeof(string),
                    oldType: "TEXT",
                    oldNullable: true);

                migrationBuilder.AlterColumn<string>(
                    name: "PrimaryEmail",
                    table: "Organization",
                    type: "text",
                    nullable: true,
                    oldClrType: typeof(string),
                    oldType: "TEXT",
                    oldNullable: true);

                migrationBuilder.AlterColumn<string>(
                    name: "PostalCode",
                    table: "Organization",
                    type: "text",
                    nullable: true,
                    oldClrType: typeof(string),
                    oldType: "TEXT",
                    oldNullable: true);

                migrationBuilder.AlterColumn<string>(
                    name: "OrganizationName",
                    table: "Organization",
                    type: "text",
                    nullable: false,
                    oldClrType: typeof(string),
                    oldType: "TEXT");

                migrationBuilder.AlterColumn<DateTime>(
                    name: "ModifiedOn",
                    table: "Organization",
                    type: "timestamp with time zone",
                    nullable: true,
                    oldClrType: typeof(DateTime),
                    oldType: "timestamp with time zone",
                    oldNullable: true);

                migrationBuilder.AlterColumn<string>(
                    name: "Locality",
                    table: "Organization",
                    type: "text",
                    nullable: true,
                    oldClrType: typeof(string),
                    oldType: "TEXT",
                    oldNullable: true);

                migrationBuilder.AlterColumn<bool>(
                    name: "IsEnabled",
                    table: "Organization",
                    type: "boolean",
                    nullable: false,
                    oldClrType: typeof(bool),
                    oldType: "BOOLEAN");

                migrationBuilder.AlterColumn<DateTime>(
                    name: "CreatedOn",
                    table: "Organization",
                    type: "timestamp with time zone",
                    nullable: false,
                    oldClrType: typeof(DateTime),
                    oldType: "timestamp with time zone");

                migrationBuilder.AlterColumn<string>(
                    name: "CountryCode",
                    table: "Organization",
                    type: "text",
                    nullable: true,
                    oldClrType: typeof(string),
                    oldType: "TEXT",
                    oldNullable: true);

                migrationBuilder.AlterColumn<string>(
                    name: "AddressLine3",
                    table: "Organization",
                    type: "text",
                    nullable: true,
                    oldClrType: typeof(string),
                    oldType: "TEXT",
                    oldNullable: true);

                migrationBuilder.AlterColumn<string>(
                    name: "AddressLine2",
                    table: "Organization",
                    type: "text",
                    nullable: true,
                    oldClrType: typeof(string),
                    oldType: "TEXT",
                    oldNullable: true);

                migrationBuilder.AlterColumn<string>(
                    name: "AddressLine1",
                    table: "Organization",
                    type: "text",
                    nullable: true,
                    oldClrType: typeof(string),
                    oldType: "TEXT",
                    oldNullable: true);

                migrationBuilder.AlterColumn<Guid>(
                    name: "OrganizationId",
                    table: "Organization",
                    type: "uuid",
                    nullable: false,
                    oldClrType: typeof(Guid),
                    oldType: "uuid");

                migrationBuilder.AlterColumn<Guid>(
                    name: "OrganizationId",
                    table: "Order",
                    type: "uuid",
                    nullable: false,
                    oldClrType: typeof(Guid),
                    oldType: "uuid");

                migrationBuilder.AlterColumn<DateTime>(
                    name: "OrderDate",
                    table: "Order",
                    type: "timestamp with time zone",
                    nullable: false,
                    oldClrType: typeof(DateTime),
                    oldType: "timestamp with time zone");

                migrationBuilder.AlterColumn<string>(
                    name: "CustomerName",
                    table: "Order",
                    type: "text",
                    nullable: false,
                    oldClrType: typeof(string),
                    oldType: "TEXT");

                migrationBuilder.AlterColumn<Guid>(
                    name: "Id",
                    table: "Order",
                    type: "uuid",
                    nullable: false,
                    oldClrType: typeof(Guid),
                    oldType: "uuid");

                migrationBuilder.AlterColumn<int>(
                    name: "Tier",
                    table: "LicenseSubscription",
                    type: "integer",
                    nullable: false,
                    oldClrType: typeof(int),
                    oldType: "INTEGER");

            migrationBuilder.AlterColumn<string>(
                name: "ReferralCode",
                table: "LicenseSubscription",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "OrganizationId",
                table: "LicenseSubscription",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<DateTime>(
                name: "ModifiedOn",
                table: "LicenseSubscription",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "LicenseSubscription",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER");

            migrationBuilder.AlterColumn<DateTime>(
                name: "EndDate",
                table: "LicenseSubscription",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedOn",
                table: "LicenseSubscription",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<Guid>(
                name: "SubscriptionId",
                table: "LicenseSubscription",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "UserName",
                table: "SystemUser",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "UserRole",
                table: "SystemUser",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "PasswordHash",
                table: "SystemUser",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "OrganizationId",
                table: "SystemUser",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<string>(
                name: "LastName",
                table: "SystemUser",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "LastLoginOn",
                table: "SystemUser",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "IsEnabled",
                table: "SystemUser",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<string>(
                name: "FirstName",
                table: "SystemUser",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "EmailAddress",
                table: "SystemUser",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "CreatedOn",
                table: "SystemUser",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "SystemUser",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<string>(
                name: "RegistrationToken",
                table: "Organization",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "region",
                table: "Organization",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "primaryemail",
                table: "Organization",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "postalcode",
                table: "Organization",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "organizationname",
                table: "Organization",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "modifiedon",
                table: "Organization",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "locality",
                table: "Organization",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "isenabled",
                table: "Organization",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<string>(
                name: "createdon",
                table: "Organization",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "countrycode",
                table: "Organization",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "addressline3",
                table: "Organization",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "addressline2",
                table: "Organization",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "addressline1",
                table: "Organization",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "organizationid",
                table: "Organization",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<string>(
                name: "organizationid",
                table: "Order",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<string>(
                name: "orderdate",
                table: "Order",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "customername",
                table: "Order",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "id",
                table: "Order",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<int>(
                name: "tier",
                table: "LicenseSubscription",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "startdate",
                table: "LicenseSubscription",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "referralcode",
                table: "LicenseSubscription",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "organizationid",
                table: "LicenseSubscription",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<string>(
                name: "modifiedon",
                table: "LicenseSubscription",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<int>(
                name: "isactive",
                table: "LicenseSubscription",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<string>(
                name: "enddate",
                table: "LicenseSubscription",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "createdon",
                table: "LicenseSubscription",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "subscriptionid",
                table: "LicenseSubscription",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");
        }
    }
}
