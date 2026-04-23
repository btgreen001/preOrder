using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderMgmt.Migrations
{
    /// <inheritdoc />
    public partial class AddExternalIdColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add external_id columns to all tables that need dual IDs
            // This migration adds UUID external ID columns while keeping existing BIGINT id (added via application)

            // Step 1: Add external_id to customer table
            migrationBuilder.Sql(@"
                ALTER TABLE customer
                ADD COLUMN IF NOT EXISTS external_id uuid NOT NULL DEFAULT gen_random_uuid();
                CREATE UNIQUE INDEX IF NOT EXISTS customer__external_id__UIX ON customer(external_id);
            ");

            // Step 2: Add external_id to customer_order table
            migrationBuilder.Sql(@"
                ALTER TABLE customer_order
                ADD COLUMN IF NOT EXISTS external_id uuid NOT NULL DEFAULT gen_random_uuid();
                CREATE UNIQUE INDEX IF NOT EXISTS customer_order__external_id__UIX ON customer_order(external_id);
            ");

            // Step 3: Add external_id to order_item table
            migrationBuilder.Sql(@"
                ALTER TABLE order_item
                ADD COLUMN IF NOT EXISTS external_id uuid NOT NULL DEFAULT gen_random_uuid();
                CREATE UNIQUE INDEX IF NOT EXISTS order_item__external_id__UIX ON order_item(external_id);
            ");

            // Step 4: Add external_id to sellable_product table
            migrationBuilder.Sql(@"
                ALTER TABLE sellable_product
                ADD COLUMN IF NOT EXISTS external_id uuid NOT NULL DEFAULT gen_random_uuid();
                CREATE UNIQUE INDEX IF NOT EXISTS sellable_product__external_id__UIX ON sellable_product(external_id);
            ");

            // Step 5: Add external_id to inventory_item table
            migrationBuilder.Sql(@"
                ALTER TABLE inventory_item
                ADD COLUMN IF NOT EXISTS external_id uuid NOT NULL DEFAULT gen_random_uuid();
                CREATE UNIQUE INDEX IF NOT EXISTS inventory_item__external_id__UIX ON inventory_item(external_id);
            ");

            // Step 6: Add external_id to supplier table
            migrationBuilder.Sql(@"
                ALTER TABLE supplier
                ADD COLUMN IF NOT EXISTS external_id uuid NOT NULL DEFAULT gen_random_uuid();
                CREATE UNIQUE INDEX IF NOT EXISTS supplier__external_id__UIX ON supplier(external_id);
            ");

            // Step 7: Add external_id to inventory_movement table
            migrationBuilder.Sql(@"
                ALTER TABLE inventory_movement
                ADD COLUMN IF NOT EXISTS external_id uuid NOT NULL DEFAULT gen_random_uuid();
                CREATE UNIQUE INDEX IF NOT EXISTS inventory_movement__external_id__UIX ON inventory_movement(external_id);
            ");

            // Step 8: Add parent_organization_id to organization table
            // Note: Added as optional UUID column, no FK constraint (multi-tenant hierarchies for Phase 3+)
            migrationBuilder.Sql(@"
                ALTER TABLE organization
                ADD COLUMN IF NOT EXISTS parent_organization_id uuid;
                CREATE INDEX IF NOT EXISTS organization__parent_organization_id__IX ON organization(parent_organization_id);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Revert: Remove external_id columns
            migrationBuilder.Sql(@"
                ALTER TABLE customer DROP COLUMN IF EXISTS external_id;
                ALTER TABLE customer_order DROP COLUMN IF EXISTS external_id;
                ALTER TABLE order_item DROP COLUMN IF EXISTS external_id;
                ALTER TABLE sellable_product DROP COLUMN IF EXISTS external_id;
                ALTER TABLE inventory_item DROP COLUMN IF EXISTS external_id;
                ALTER TABLE supplier DROP COLUMN IF EXISTS external_id;
                ALTER TABLE inventory_movement DROP COLUMN IF EXISTS external_id;
                ALTER TABLE organization DROP COLUMN IF EXISTS parent_organization_id;
            ");
        }
    }
}
