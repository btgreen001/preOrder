using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderMgmt.Migrations
{
    /// <inheritdoc />
    public partial class Phase3_1_CreateRecipeAndBatchTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Phase 3.1: Create 6 new tables for recipe and batch management
            // All use dual ID architecture: BIGINT id (PK) + UUID external_id (unique index)
            // All include organization_id for multi-tenancy
            // All include full audit fields: created_by, created_at, updated_by, updated_at, version_nbr

            // Table 1: recipe_detail - Master recipes linking ingredients to finished goods
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS recipe_detail (
                    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                    external_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
                    organization_id UUID NOT NULL,
                    product_id BIGINT NOT NULL,
                    recipe_name VARCHAR(255) NOT NULL,
                    description VARCHAR(2000),
                    yield_quantity INT NOT NULL DEFAULT 1,
                    yield_unit VARCHAR(50) NOT NULL DEFAULT 'pieces',
                    cost_per_unit NUMERIC(18,4) NOT NULL DEFAULT 0,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_by VARCHAR(255) NOT NULL DEFAULT 'system',
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    version_nbr INT NOT NULL DEFAULT 1,
                    CONSTRAINT recipe_detail__sellable_product__FK FOREIGN KEY (product_id) REFERENCES sellable_product(id),
                    CONSTRAINT recipe_detail__organization__FK FOREIGN KEY (organization_id) REFERENCES organization(organization_id)
                );
                CREATE INDEX IF NOT EXISTS recipe_detail__external_id__UIX ON recipe_detail(external_id) UNIQUE;
                CREATE INDEX IF NOT EXISTS recipe_detail__organization_id__IX ON recipe_detail(organization_id);
                CREATE INDEX IF NOT EXISTS recipe_detail__product_id__IX ON recipe_detail(product_id);
            ");

            // Table 2: recipe_ingredient - Individual ingredients in each recipe
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS recipe_ingredient (
                    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                    external_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
                    organization_id UUID NOT NULL,
                    recipe_id BIGINT NOT NULL,
                    inventory_item_id BIGINT NOT NULL,
                    quantity_required NUMERIC(18,4) NOT NULL DEFAULT 1,
                    unit VARCHAR(50) NOT NULL DEFAULT 'cups',
                    cost_per_unit NUMERIC(18,4) NOT NULL DEFAULT 0,
                    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_by VARCHAR(255) NOT NULL DEFAULT 'system',
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    version_nbr INT NOT NULL DEFAULT 1,
                    CONSTRAINT recipe_detail__recipe_ingredient__FK FOREIGN KEY (recipe_id) REFERENCES recipe_detail(id),
                    CONSTRAINT inventory_item__recipe_ingredient__FK FOREIGN KEY (inventory_item_id) REFERENCES inventory_item(id),
                    CONSTRAINT recipe_ingredient__organization__FK FOREIGN KEY (organization_id) REFERENCES organization(organization_id)
                );
                CREATE INDEX IF NOT EXISTS recipe_ingredient__external_id__UIX ON recipe_ingredient(external_id) UNIQUE;
                CREATE INDEX IF NOT EXISTS recipe_ingredient__organization_id__IX ON recipe_ingredient(organization_id);
                CREATE INDEX IF NOT EXISTS recipe_ingredient__recipe_id__IX ON recipe_ingredient(recipe_id);
                CREATE INDEX IF NOT EXISTS recipe_ingredient__inventory_item_id__IX ON recipe_ingredient(inventory_item_id);
            ");

            // Table 3: recipe_composition - Recipe sections (e.g., dough, filling, frosting)
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS recipe_composition (
                    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                    external_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
                    organization_id UUID NOT NULL,
                    parent_recipe_id BIGINT NOT NULL,
                    sub_recipe_id BIGINT,
                    section_name VARCHAR(255) NOT NULL,
                    sequence_number INT NOT NULL DEFAULT 1,
                    quantity NUMERIC(18,4) NOT NULL DEFAULT 1,
                    unit VARCHAR(50) NOT NULL DEFAULT 'batch',
                    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_by VARCHAR(255) NOT NULL DEFAULT 'system',
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    version_nbr INT NOT NULL DEFAULT 1,
                    CONSTRAINT recipe_detail__recipe_composition_parent__FK FOREIGN KEY (parent_recipe_id) REFERENCES recipe_detail(id),
                    CONSTRAINT recipe_detail__recipe_composition_sub__FK FOREIGN KEY (sub_recipe_id) REFERENCES recipe_detail(id),
                    CONSTRAINT recipe_composition__organization__FK FOREIGN KEY (organization_id) REFERENCES organization(organization_id)
                );
                CREATE INDEX IF NOT EXISTS recipe_composition__external_id__UIX ON recipe_composition(external_id) UNIQUE;
                CREATE INDEX IF NOT EXISTS recipe_composition__organization_id__IX ON recipe_composition(organization_id);
                CREATE INDEX IF NOT EXISTS recipe_composition__parent_recipe_id__IX ON recipe_composition(parent_recipe_id);
            ");

            // Table 4: recipe_product - Links recipes to finished products (many-to-many)
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS recipe_product (
                    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                    external_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
                    organization_id UUID NOT NULL,
                    recipe_id BIGINT NOT NULL,
                    product_id BIGINT NOT NULL,
                    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
                    variation_name VARCHAR(255),
                    notes VARCHAR(2000),
                    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_by VARCHAR(255) NOT NULL DEFAULT 'system',
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    version_nbr INT NOT NULL DEFAULT 1,
                    CONSTRAINT recipe_detail__recipe_product__FK FOREIGN KEY (recipe_id) REFERENCES recipe_detail(id),
                    CONSTRAINT sellable_product__recipe_product__FK FOREIGN KEY (product_id) REFERENCES sellable_product(id),
                    CONSTRAINT recipe_product__organization__FK FOREIGN KEY (organization_id) REFERENCES organization(organization_id)
                );
                CREATE INDEX IF NOT EXISTS recipe_product__external_id__UIX ON recipe_product(external_id) UNIQUE;
                CREATE INDEX IF NOT EXISTS recipe_product__organization_id__IX ON recipe_product(organization_id);
                CREATE INDEX IF NOT EXISTS recipe_product__recipe_id__IX ON recipe_product(recipe_id);
                CREATE INDEX IF NOT EXISTS recipe_product__product_id__IX ON recipe_product(product_id);
            ");

            // Table 5: finished_goods_batch - Production batches of finished goods
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS finished_goods_batch (
                    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                    external_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
                    organization_id UUID NOT NULL,
                    recipe_id BIGINT NOT NULL,
                    product_id BIGINT NOT NULL,
                    quantity_produced INT NOT NULL DEFAULT 1,
                    unit VARCHAR(50) NOT NULL DEFAULT 'pieces',
                    production_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    expiration_date TIMESTAMP,
                    cost_per_unit NUMERIC(18,4) NOT NULL DEFAULT 0,
                    batch_number VARCHAR(50),
                    status VARCHAR(50) NOT NULL DEFAULT 'Active',
                    quantity_sold INT NOT NULL DEFAULT 0,
                    quantity_wasted INT NOT NULL DEFAULT 0,
                    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_by VARCHAR(255) NOT NULL DEFAULT 'system',
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    version_nbr INT NOT NULL DEFAULT 1,
                    CONSTRAINT recipe_detail__finished_goods_batch__FK FOREIGN KEY (recipe_id) REFERENCES recipe_detail(id),
                    CONSTRAINT sellable_product__finished_goods_batch__FK FOREIGN KEY (product_id) REFERENCES sellable_product(id),
                    CONSTRAINT finished_goods_batch__organization__FK FOREIGN KEY (organization_id) REFERENCES organization(organization_id)
                );
                CREATE INDEX IF NOT EXISTS finished_goods_batch__external_id__UIX ON finished_goods_batch(external_id) UNIQUE;
                CREATE INDEX IF NOT EXISTS finished_goods_batch__organization_id__IX ON finished_goods_batch(organization_id);
                CREATE INDEX IF NOT EXISTS finished_goods_batch__recipe_id__IX ON finished_goods_batch(recipe_id);
                CREATE INDEX IF NOT EXISTS finished_goods_batch__product_id__IX ON finished_goods_batch(product_id);
                CREATE INDEX IF NOT EXISTS finished_goods_batch__status__IX ON finished_goods_batch(status);
            ");

            // Table 6: waste_event - Waste and spoilage tracking
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS waste_event (
                    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                    external_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
                    organization_id UUID NOT NULL,
                    batch_id BIGINT,
                    inventory_item_id BIGINT,
                    quantity_wasted NUMERIC(18,4) NOT NULL DEFAULT 1,
                    unit VARCHAR(50) NOT NULL DEFAULT 'pieces',
                    waste_reason VARCHAR(100) NOT NULL DEFAULT 'Other',
                    waste_cost NUMERIC(18,4) NOT NULL DEFAULT 0,
                    recorded_by VARCHAR(255) NOT NULL DEFAULT 'system',
                    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    notes VARCHAR(2000),
                    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_by VARCHAR(255) NOT NULL DEFAULT 'system',
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    version_nbr INT NOT NULL DEFAULT 1,
                    CONSTRAINT finished_goods_batch__waste_event__FK FOREIGN KEY (batch_id) REFERENCES finished_goods_batch(id),
                    CONSTRAINT inventory_item__waste_event__FK FOREIGN KEY (inventory_item_id) REFERENCES inventory_item(id),
                    CONSTRAINT waste_event__organization__FK FOREIGN KEY (organization_id) REFERENCES organization(organization_id)
                );
                CREATE INDEX IF NOT EXISTS waste_event__external_id__UIX ON waste_event(external_id) UNIQUE;
                CREATE INDEX IF NOT EXISTS waste_event__organization_id__IX ON waste_event(organization_id);
                CREATE INDEX IF NOT EXISTS waste_event__batch_id__IX ON waste_event(batch_id);
                CREATE INDEX IF NOT EXISTS waste_event__inventory_item_id__IX ON waste_event(inventory_item_id);
                CREATE INDEX IF NOT EXISTS waste_event__reason__IX ON waste_event(waste_reason);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Revert: Drop all 6 Phase 3.1 tables
            migrationBuilder.Sql(@"
                DROP TABLE IF EXISTS waste_event CASCADE;
                DROP TABLE IF EXISTS finished_goods_batch CASCADE;
                DROP TABLE IF EXISTS recipe_product CASCADE;
                DROP TABLE IF EXISTS recipe_composition CASCADE;
                DROP TABLE IF EXISTS recipe_ingredient CASCADE;
                DROP TABLE IF EXISTS recipe_detail CASCADE;
            ");
        }
    }
}
