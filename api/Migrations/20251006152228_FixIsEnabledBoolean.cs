using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PreOrderApp.Migrations
{
    /// <inheritdoc />
    public partial class FixIsEnabledBoolean : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF to_regclass('public."SystemUser"') IS NOT NULL THEN
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SystemUser' AND column_name='UserName') THEN
                            ALTER TABLE "SystemUser" ALTER COLUMN "UserName" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SystemUser' AND column_name='UserRole') THEN
                            ALTER TABLE "SystemUser" ALTER COLUMN "UserRole" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SystemUser' AND column_name='PasswordHash') THEN
                            ALTER TABLE "SystemUser" ALTER COLUMN "PasswordHash" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SystemUser' AND column_name='OrganizationId') THEN
                            ALTER TABLE "SystemUser" ALTER COLUMN "OrganizationId" TYPE uuid USING "OrganizationId"::uuid;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SystemUser' AND column_name='LastName') THEN
                            ALTER TABLE "SystemUser" ALTER COLUMN "LastName" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SystemUser' AND column_name='LastLoginOn') THEN
                            ALTER TABLE "SystemUser" ALTER COLUMN "LastLoginOn" TYPE timestamptz USING NULLIF("LastLoginOn", '')::timestamptz;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SystemUser' AND column_name='IsEnabled') THEN
                            ALTER TABLE "SystemUser" ALTER COLUMN "IsEnabled" TYPE boolean USING CASE WHEN "IsEnabled"::text IN ('1','true','TRUE','t','T') THEN true ELSE false END;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SystemUser' AND column_name='FirstName') THEN
                            ALTER TABLE "SystemUser" ALTER COLUMN "FirstName" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SystemUser' AND column_name='EmailAddress') THEN
                            ALTER TABLE "SystemUser" ALTER COLUMN "EmailAddress" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SystemUser' AND column_name='CreatedOn') THEN
                            ALTER TABLE "SystemUser" ALTER COLUMN "CreatedOn" TYPE timestamptz USING "CreatedOn"::timestamptz;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SystemUser' AND column_name='UserId') THEN
                            ALTER TABLE "SystemUser" ALTER COLUMN "UserId" TYPE uuid USING "UserId"::uuid;
                        END IF;
                    END IF;

                    IF to_regclass('public."Organization"') IS NOT NULL THEN
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='RegistrationToken') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "RegistrationToken" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='Region') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "Region" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='PrimaryEmail') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "PrimaryEmail" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='PostalCode') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "PostalCode" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='OrganizationName') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "OrganizationName" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='ModifiedOn') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "ModifiedOn" TYPE timestamptz USING NULLIF("ModifiedOn"::text, '')::timestamptz;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='Locality') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "Locality" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='IsEnabled') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "IsEnabled" TYPE boolean USING CASE WHEN "IsEnabled"::text IN ('1','true','TRUE','t','T') THEN true ELSE false END;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='CreatedOn') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "CreatedOn" TYPE timestamptz USING "CreatedOn"::timestamptz;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='CountryCode') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "CountryCode" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='AddressLine3') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "AddressLine3" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='AddressLine2') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "AddressLine2" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='AddressLine1') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "AddressLine1" TYPE text;
                        END IF;
                    END IF;

                    IF to_regclass('public."Order"') IS NOT NULL THEN
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Order' AND column_name='OrderDate') THEN
                            ALTER TABLE "Order" ALTER COLUMN "OrderDate" TYPE timestamptz USING "OrderDate"::timestamptz;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Order' AND column_name='CustomerName') THEN
                            ALTER TABLE "Order" ALTER COLUMN "CustomerName" TYPE text;
                        END IF;
                    END IF;

                    IF to_regclass('public."LicenseSubscription"') IS NOT NULL THEN
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='LicenseSubscription' AND column_name='Tier') THEN
                            ALTER TABLE "LicenseSubscription" ALTER COLUMN "Tier" TYPE integer USING "Tier"::integer;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='LicenseSubscription' AND column_name='ReferralCode') THEN
                            ALTER TABLE "LicenseSubscription" ALTER COLUMN "ReferralCode" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='LicenseSubscription' AND column_name='OrganizationId') THEN
                            ALTER TABLE "LicenseSubscription" ALTER COLUMN "OrganizationId" TYPE uuid USING "OrganizationId"::uuid;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='LicenseSubscription' AND column_name='ModifiedOn') THEN
                            ALTER TABLE "LicenseSubscription" ALTER COLUMN "ModifiedOn" TYPE timestamptz USING "ModifiedOn"::timestamptz;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='LicenseSubscription' AND column_name='IsActive') THEN
                            ALTER TABLE "LicenseSubscription" ALTER COLUMN "IsActive" TYPE boolean USING CASE WHEN "IsActive"::text IN ('1','true','TRUE','t','T') THEN true ELSE false END;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='LicenseSubscription' AND column_name='EndDate') THEN
                            ALTER TABLE "LicenseSubscription" ALTER COLUMN "EndDate" TYPE timestamptz USING "EndDate"::timestamptz;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='LicenseSubscription' AND column_name='CreatedOn') THEN
                            ALTER TABLE "LicenseSubscription" ALTER COLUMN "CreatedOn" TYPE timestamptz USING "CreatedOn"::timestamptz;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='LicenseSubscription' AND column_name='SubscriptionId') THEN
                            ALTER TABLE "LicenseSubscription" ALTER COLUMN "SubscriptionId" TYPE uuid USING "SubscriptionId"::uuid;
                        END IF;
                    END IF;
                END
                $$;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF to_regclass('public."SystemUser"') IS NOT NULL THEN
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SystemUser' AND column_name='UserName') THEN
                            ALTER TABLE "SystemUser" ALTER COLUMN "UserName" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SystemUser' AND column_name='UserRole') THEN
                            ALTER TABLE "SystemUser" ALTER COLUMN "UserRole" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SystemUser' AND column_name='PasswordHash') THEN
                            ALTER TABLE "SystemUser" ALTER COLUMN "PasswordHash" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SystemUser' AND column_name='OrganizationId') THEN
                            ALTER TABLE "SystemUser" ALTER COLUMN "OrganizationId" TYPE text USING "OrganizationId"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SystemUser' AND column_name='LastName') THEN
                            ALTER TABLE "SystemUser" ALTER COLUMN "LastName" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SystemUser' AND column_name='LastLoginOn') THEN
                            ALTER TABLE "SystemUser" ALTER COLUMN "LastLoginOn" TYPE text USING "LastLoginOn"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SystemUser' AND column_name='IsEnabled') THEN
                            ALTER TABLE "SystemUser" ALTER COLUMN "IsEnabled" TYPE integer USING CASE WHEN "IsEnabled" THEN 1 ELSE 0 END;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SystemUser' AND column_name='FirstName') THEN
                            ALTER TABLE "SystemUser" ALTER COLUMN "FirstName" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SystemUser' AND column_name='EmailAddress') THEN
                            ALTER TABLE "SystemUser" ALTER COLUMN "EmailAddress" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SystemUser' AND column_name='CreatedOn') THEN
                            ALTER TABLE "SystemUser" ALTER COLUMN "CreatedOn" TYPE text USING "CreatedOn"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SystemUser' AND column_name='UserId') THEN
                            ALTER TABLE "SystemUser" ALTER COLUMN "UserId" TYPE text USING "UserId"::text;
                        END IF;
                    END IF;

                    IF to_regclass('public."Organization"') IS NOT NULL THEN
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='RegistrationToken') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "RegistrationToken" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='Region') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "Region" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='PrimaryEmail') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "PrimaryEmail" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='PostalCode') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "PostalCode" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='OrganizationName') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "OrganizationName" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='ModifiedOn') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "ModifiedOn" TYPE text USING "ModifiedOn"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='Locality') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "Locality" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='IsEnabled') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "IsEnabled" TYPE integer USING CASE WHEN "IsEnabled" THEN 1 ELSE 0 END;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='CreatedOn') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "CreatedOn" TYPE text USING "CreatedOn"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='CountryCode') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "CountryCode" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='AddressLine3') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "AddressLine3" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='AddressLine2') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "AddressLine2" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='AddressLine1') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "AddressLine1" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Organization' AND column_name='OrganizationId') THEN
                            ALTER TABLE "Organization" ALTER COLUMN "OrganizationId" TYPE text USING "OrganizationId"::text;
                        END IF;
                    END IF;

                    IF to_regclass('public."Order"') IS NOT NULL THEN
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Order' AND column_name='OrganizationId') THEN
                            ALTER TABLE "Order" ALTER COLUMN "OrganizationId" TYPE text USING "OrganizationId"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Order' AND column_name='OrderDate') THEN
                            ALTER TABLE "Order" ALTER COLUMN "OrderDate" TYPE text USING "OrderDate"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Order' AND column_name='CustomerName') THEN
                            ALTER TABLE "Order" ALTER COLUMN "CustomerName" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Order' AND column_name='Id') THEN
                            ALTER TABLE "Order" ALTER COLUMN "Id" TYPE text USING "Id"::text;
                        END IF;
                    END IF;

                    IF to_regclass('public."LicenseSubscription"') IS NOT NULL THEN
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='LicenseSubscription' AND column_name='Tier') THEN
                            ALTER TABLE "LicenseSubscription" ALTER COLUMN "Tier" TYPE integer USING "Tier"::integer;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='LicenseSubscription' AND column_name='StartDate') THEN
                            ALTER TABLE "LicenseSubscription" ALTER COLUMN "StartDate" TYPE text USING "StartDate"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='LicenseSubscription' AND column_name='ReferralCode') THEN
                            ALTER TABLE "LicenseSubscription" ALTER COLUMN "ReferralCode" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='LicenseSubscription' AND column_name='OrganizationId') THEN
                            ALTER TABLE "LicenseSubscription" ALTER COLUMN "OrganizationId" TYPE text USING "OrganizationId"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='LicenseSubscription' AND column_name='ModifiedOn') THEN
                            ALTER TABLE "LicenseSubscription" ALTER COLUMN "ModifiedOn" TYPE text USING "ModifiedOn"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='LicenseSubscription' AND column_name='IsActive') THEN
                            ALTER TABLE "LicenseSubscription" ALTER COLUMN "IsActive" TYPE integer USING CASE WHEN "IsActive" THEN 1 ELSE 0 END;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='LicenseSubscription' AND column_name='EndDate') THEN
                            ALTER TABLE "LicenseSubscription" ALTER COLUMN "EndDate" TYPE text USING "EndDate"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='LicenseSubscription' AND column_name='CreatedOn') THEN
                            ALTER TABLE "LicenseSubscription" ALTER COLUMN "CreatedOn" TYPE text USING "CreatedOn"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='LicenseSubscription' AND column_name='SubscriptionId') THEN
                            ALTER TABLE "LicenseSubscription" ALTER COLUMN "SubscriptionId" TYPE text USING "SubscriptionId"::text;
                        END IF;
                    END IF;
                END
                $$;
                """);
        }
    }
}
