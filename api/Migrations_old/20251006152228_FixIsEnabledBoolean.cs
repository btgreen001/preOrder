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
                    -- Physical names from AppDbContext mappings
                    IF to_regclass('public.app_user') IS NOT NULL THEN
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user' AND column_name='user_name') THEN
                            ALTER TABLE "app_user" ALTER COLUMN "user_name" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user' AND column_name='user_role') THEN
                            ALTER TABLE "app_user" ALTER COLUMN "user_role" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user' AND column_name='password_hash') THEN
                            ALTER TABLE "app_user" ALTER COLUMN "password_hash" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user' AND column_name='organization_id') THEN
                            ALTER TABLE "app_user" ALTER COLUMN "organization_id" TYPE uuid USING "organization_id"::uuid;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user' AND column_name='last_name') THEN
                            ALTER TABLE "app_user" ALTER COLUMN "last_name" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user' AND column_name='last_login_on') THEN
                            ALTER TABLE "app_user" ALTER COLUMN "last_login_on" TYPE timestamptz USING NULLIF("last_login_on"::text, '')::timestamptz;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user' AND column_name='is_enabled') THEN
                            ALTER TABLE "app_user" ALTER COLUMN "is_enabled" TYPE boolean USING CASE WHEN lower(coalesce("is_enabled"::text, '')) IN ('1','true','t') THEN true ELSE false END;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user' AND column_name='first_name') THEN
                            ALTER TABLE "app_user" ALTER COLUMN "first_name" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user' AND column_name='email_address') THEN
                            ALTER TABLE "app_user" ALTER COLUMN "email_address" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user' AND column_name='created_on') THEN
                            ALTER TABLE "app_user" ALTER COLUMN "created_on" TYPE timestamptz USING "created_on"::timestamptz;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user' AND column_name='user_id') THEN
                            ALTER TABLE "app_user" ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;
                        END IF;
                    END IF;

                    IF to_regclass('public.organization') IS NOT NULL THEN
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='registration_token') THEN
                            ALTER TABLE "organization" ALTER COLUMN "registration_token" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='region') THEN
                            ALTER TABLE "organization" ALTER COLUMN "region" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='primary_email') THEN
                            ALTER TABLE "organization" ALTER COLUMN "primary_email" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='postal_code') THEN
                            ALTER TABLE "organization" ALTER COLUMN "postal_code" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='organization_name') THEN
                            ALTER TABLE "organization" ALTER COLUMN "organization_name" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='modified_on') THEN
                            ALTER TABLE "organization" ALTER COLUMN "modified_on" TYPE timestamptz USING NULLIF("modified_on"::text, '')::timestamptz;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='locality') THEN
                            ALTER TABLE "organization" ALTER COLUMN "locality" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='is_enabled') THEN
                            ALTER TABLE "organization" ALTER COLUMN "is_enabled" TYPE boolean USING CASE WHEN lower(coalesce("is_enabled"::text, '')) IN ('1','true','t') THEN true ELSE false END;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='created_on') THEN
                            ALTER TABLE "organization" ALTER COLUMN "created_on" TYPE timestamptz USING "created_on"::timestamptz;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='country_code') THEN
                            ALTER TABLE "organization" ALTER COLUMN "country_code" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='address_line3') THEN
                            ALTER TABLE "organization" ALTER COLUMN "address_line3" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='address_line2') THEN
                            ALTER TABLE "organization" ALTER COLUMN "address_line2" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='address_line1') THEN
                            ALTER TABLE "organization" ALTER COLUMN "address_line1" TYPE text;
                        END IF;
                    END IF;

                    IF to_regclass('public.customer_order') IS NOT NULL THEN
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customer_order' AND column_name='organization_id') THEN
                            ALTER TABLE "customer_order" ALTER COLUMN "organization_id" TYPE uuid USING "organization_id"::uuid;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customer_order' AND column_name='order_date') THEN
                            ALTER TABLE "customer_order" ALTER COLUMN "order_date" TYPE timestamptz USING "order_date"::timestamptz;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customer_order' AND column_name='customer_name') THEN
                            ALTER TABLE "customer_order" ALTER COLUMN "customer_name" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customer_order' AND column_name='id') THEN
                            ALTER TABLE "customer_order" ALTER COLUMN "id" TYPE uuid USING "id"::uuid;
                        END IF;
                    END IF;

                    IF to_regclass('public.license_subscription') IS NOT NULL THEN
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='license_subscription' AND column_name='tier') THEN
                            ALTER TABLE "license_subscription" ALTER COLUMN "tier" TYPE integer USING NULLIF("tier"::text, '')::integer;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='license_subscription' AND column_name='referral_code') THEN
                            ALTER TABLE "license_subscription" ALTER COLUMN "referral_code" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='license_subscription' AND column_name='organization_id') THEN
                            ALTER TABLE "license_subscription" ALTER COLUMN "organization_id" TYPE uuid USING "organization_id"::uuid;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='license_subscription' AND column_name='modified_on') THEN
                            ALTER TABLE "license_subscription" ALTER COLUMN "modified_on" TYPE timestamptz USING "modified_on"::timestamptz;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='license_subscription' AND column_name='is_active') THEN
                            ALTER TABLE "license_subscription" ALTER COLUMN "is_active" TYPE boolean USING CASE WHEN lower(coalesce("is_active"::text, '')) IN ('1','true','t') THEN true ELSE false END;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='license_subscription' AND column_name='end_date') THEN
                            ALTER TABLE "license_subscription" ALTER COLUMN "end_date" TYPE timestamptz USING "end_date"::timestamptz;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='license_subscription' AND column_name='created_on') THEN
                            ALTER TABLE "license_subscription" ALTER COLUMN "created_on" TYPE timestamptz USING "created_on"::timestamptz;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='license_subscription' AND column_name='subscription_id') THEN
                            ALTER TABLE "license_subscription" ALTER COLUMN "subscription_id" TYPE uuid USING "subscription_id"::uuid;
                        END IF;
                    END IF;

                    -- Legacy PascalCase fallback
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
                    -- Physical names from AppDbContext mappings
                    IF to_regclass('public.app_user') IS NOT NULL THEN
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user' AND column_name='user_name') THEN
                            ALTER TABLE "app_user" ALTER COLUMN "user_name" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user' AND column_name='user_role') THEN
                            ALTER TABLE "app_user" ALTER COLUMN "user_role" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user' AND column_name='password_hash') THEN
                            ALTER TABLE "app_user" ALTER COLUMN "password_hash" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user' AND column_name='organization_id') THEN
                            ALTER TABLE "app_user" ALTER COLUMN "organization_id" TYPE text USING "organization_id"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user' AND column_name='last_name') THEN
                            ALTER TABLE "app_user" ALTER COLUMN "last_name" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user' AND column_name='last_login_on') THEN
                            ALTER TABLE "app_user" ALTER COLUMN "last_login_on" TYPE text USING "last_login_on"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user' AND column_name='is_enabled') THEN
                            ALTER TABLE "app_user" ALTER COLUMN "is_enabled" TYPE integer USING CASE WHEN lower(coalesce("is_enabled"::text, '')) IN ('1','true','t') THEN 1 ELSE 0 END;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user' AND column_name='first_name') THEN
                            ALTER TABLE "app_user" ALTER COLUMN "first_name" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user' AND column_name='email_address') THEN
                            ALTER TABLE "app_user" ALTER COLUMN "email_address" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user' AND column_name='created_on') THEN
                            ALTER TABLE "app_user" ALTER COLUMN "created_on" TYPE text USING "created_on"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_user' AND column_name='user_id') THEN
                            ALTER TABLE "app_user" ALTER COLUMN "user_id" TYPE text USING "user_id"::text;
                        END IF;
                    END IF;

                    IF to_regclass('public.organization') IS NOT NULL THEN
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='registration_token') THEN
                            ALTER TABLE "organization" ALTER COLUMN "registration_token" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='region') THEN
                            ALTER TABLE "organization" ALTER COLUMN "region" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='primary_email') THEN
                            ALTER TABLE "organization" ALTER COLUMN "primary_email" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='postal_code') THEN
                            ALTER TABLE "organization" ALTER COLUMN "postal_code" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='organization_name') THEN
                            ALTER TABLE "organization" ALTER COLUMN "organization_name" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='modified_on') THEN
                            ALTER TABLE "organization" ALTER COLUMN "modified_on" TYPE text USING "modified_on"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='locality') THEN
                            ALTER TABLE "organization" ALTER COLUMN "locality" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='is_enabled') THEN
                            ALTER TABLE "organization" ALTER COLUMN "is_enabled" TYPE integer USING CASE WHEN lower(coalesce("is_enabled"::text, '')) IN ('1','true','t') THEN 1 ELSE 0 END;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='created_on') THEN
                            ALTER TABLE "organization" ALTER COLUMN "created_on" TYPE text USING "created_on"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='country_code') THEN
                            ALTER TABLE "organization" ALTER COLUMN "country_code" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='address_line3') THEN
                            ALTER TABLE "organization" ALTER COLUMN "address_line3" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='address_line2') THEN
                            ALTER TABLE "organization" ALTER COLUMN "address_line2" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='address_line1') THEN
                            ALTER TABLE "organization" ALTER COLUMN "address_line1" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization' AND column_name='organization_id') THEN
                            ALTER TABLE "organization" ALTER COLUMN "organization_id" TYPE text USING "organization_id"::text;
                        END IF;
                    END IF;

                    IF to_regclass('public.customer_order') IS NOT NULL THEN
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customer_order' AND column_name='organization_id') THEN
                            ALTER TABLE "customer_order" ALTER COLUMN "organization_id" TYPE text USING "organization_id"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customer_order' AND column_name='order_date') THEN
                            ALTER TABLE "customer_order" ALTER COLUMN "order_date" TYPE text USING "order_date"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customer_order' AND column_name='customer_name') THEN
                            ALTER TABLE "customer_order" ALTER COLUMN "customer_name" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='customer_order' AND column_name='id') THEN
                            ALTER TABLE "customer_order" ALTER COLUMN "id" TYPE text USING "id"::text;
                        END IF;
                    END IF;

                    IF to_regclass('public.license_subscription') IS NOT NULL THEN
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='license_subscription' AND column_name='tier') THEN
                            ALTER TABLE "license_subscription" ALTER COLUMN "tier" TYPE integer USING NULLIF("tier"::text, '')::integer;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='license_subscription' AND column_name='start_date') THEN
                            ALTER TABLE "license_subscription" ALTER COLUMN "start_date" TYPE text USING "start_date"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='license_subscription' AND column_name='referral_code') THEN
                            ALTER TABLE "license_subscription" ALTER COLUMN "referral_code" TYPE text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='license_subscription' AND column_name='organization_id') THEN
                            ALTER TABLE "license_subscription" ALTER COLUMN "organization_id" TYPE text USING "organization_id"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='license_subscription' AND column_name='modified_on') THEN
                            ALTER TABLE "license_subscription" ALTER COLUMN "modified_on" TYPE text USING "modified_on"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='license_subscription' AND column_name='is_active') THEN
                            ALTER TABLE "license_subscription" ALTER COLUMN "is_active" TYPE integer USING CASE WHEN lower(coalesce("is_active"::text, '')) IN ('1','true','t') THEN 1 ELSE 0 END;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='license_subscription' AND column_name='end_date') THEN
                            ALTER TABLE "license_subscription" ALTER COLUMN "end_date" TYPE text USING "end_date"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='license_subscription' AND column_name='created_on') THEN
                            ALTER TABLE "license_subscription" ALTER COLUMN "created_on" TYPE text USING "created_on"::text;
                        END IF;
                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='license_subscription' AND column_name='subscription_id') THEN
                            ALTER TABLE "license_subscription" ALTER COLUMN "subscription_id" TYPE text USING "subscription_id"::text;
                        END IF;
                    END IF;

                    -- Legacy PascalCase fallback
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
