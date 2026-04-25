using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PreOrderApp.Migrations
{
    public partial class NormalizeCustomerOrderPreorderForeignKeyTypes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'customer_order'
          AND column_name = 'preorder_event_id'
          AND data_type = 'character varying')
    THEN
        IF EXISTS (
            SELECT 1
            FROM public.customer_order
            WHERE preorder_event_id IS NOT NULL
              AND btrim(preorder_event_id) <> ''
              AND btrim(preorder_event_id) !~ '^[0-9]+$')
        THEN
            RAISE EXCEPTION 'Cannot convert customer_order.preorder_event_id to bigint because non-numeric values exist.';
        END IF;

        ALTER TABLE public.customer_order
            ALTER COLUMN preorder_event_id TYPE bigint
            USING CASE
                WHEN preorder_event_id IS NULL OR btrim(preorder_event_id) = '' THEN NULL
                ELSE btrim(preorder_event_id)::bigint
            END;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'customer_order'
          AND column_name = 'pickup_slot_id'
          AND data_type = 'character varying')
    THEN
        IF EXISTS (
            SELECT 1
            FROM public.customer_order
            WHERE pickup_slot_id IS NOT NULL
              AND btrim(pickup_slot_id) <> ''
              AND btrim(pickup_slot_id) !~ '^[0-9]+$')
        THEN
            RAISE EXCEPTION 'Cannot convert customer_order.pickup_slot_id to bigint because non-numeric values exist.';
        END IF;

        ALTER TABLE public.customer_order
            ALTER COLUMN pickup_slot_id TYPE bigint
            USING CASE
                WHEN pickup_slot_id IS NULL OR btrim(pickup_slot_id) = '' THEN NULL
                ELSE btrim(pickup_slot_id)::bigint
            END;
    END IF;
END $$;");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'customer_order'
          AND column_name = 'preorder_event_id'
          AND data_type = 'bigint')
    THEN
        ALTER TABLE public.customer_order
            ALTER COLUMN preorder_event_id TYPE character varying
            USING preorder_event_id::text;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'customer_order'
          AND column_name = 'pickup_slot_id'
          AND data_type = 'bigint')
    THEN
        ALTER TABLE public.customer_order
            ALTER COLUMN pickup_slot_id TYPE character varying
            USING pickup_slot_id::text;
    END IF;
END $$;");
        }
    }
}