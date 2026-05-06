-- Seed sample data for preorder_event, menu_item, pickup_slot, and pre_order
-- Safe to rerun: uses deterministic external_id values + ON CONFLICT updates.

BEGIN;

DO $$
DECLARE
    v_org_id UUID;
    v_event_id BIGINT;
    v_slot_a_id BIGINT;
    v_slot_b_id BIGINT;
    v_menu_item_a_id BIGINT;
    v_menu_item_b_id BIGINT;
    v_product_a_id BIGINT;
    v_product_b_id BIGINT;
BEGIN
    SELECT o.organization_id
      INTO v_org_id
      FROM organization o
     ORDER BY o.created_on NULLS LAST, o.organization_id
  ;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'No organization row exists. Create at least one organization first.';
    END IF;

    -- Optional product links for menu items (NULL is allowed if no products exist yet).
    SELECT sp.id
      INTO v_product_a_id
      FROM sellable_product sp
     WHERE sp.organization_id = v_org_id
     ORDER BY sp.id
     LIMIT 1;

    SELECT sp.id
      INTO v_product_b_id
      FROM sellable_product sp
     WHERE sp.organization_id = v_org_id
     ORDER BY sp.id
     OFFSET 1
     LIMIT 1;

    INSERT INTO preorder_event (
        external_id,
        organization_id,
        name,
        description,
        opens_at,
        closes_at,
        pickup_start_dt,
        pickup_end_dt,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        'aaaaaaaa-1111-4444-8888-111111111111',
        v_org_id,
        'Spring Weekend Pre-Order',
        'Sample event for validating preorder flow',
        NOW() - INTERVAL '1 day',
        NOW() + INTERVAL '7 day',
        NOW() + INTERVAL '2 day',
        NOW() + INTERVAL '4 day',
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (external_id)
    DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        opens_at = EXCLUDED.opens_at,
        closes_at = EXCLUDED.closes_at,
        pickup_start_dt = EXCLUDED.pickup_start_dt,
        pickup_end_dt = EXCLUDED.pickup_end_dt,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
    RETURNING id INTO v_event_id;

    INSERT INTO pickup_slot (
        external_id,
        organization_id,
        preorder_event_id,
        slot_start_at,
        slot_end_at,
        capacity,
        reserved_count,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        'bbbbbbbb-1111-4444-8888-111111111111',
        v_org_id,
        v_event_id,
        NOW() + INTERVAL '2 day 09:00',
        NOW() + INTERVAL '2 day 11:00',
        30,
        0,
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (external_id)
    DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        preorder_event_id = EXCLUDED.preorder_event_id,
        slot_start_at = EXCLUDED.slot_start_at,
        slot_end_at = EXCLUDED.slot_end_at,
        capacity = EXCLUDED.capacity,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
    RETURNING id INTO v_slot_a_id;

    INSERT INTO pickup_slot (
        external_id,
        organization_id,
        preorder_event_id,
        slot_start_at,
        slot_end_at,
        capacity,
        reserved_count,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        'bbbbbbbb-2222-4444-8888-222222222222',
        v_org_id,
        v_event_id,
        NOW() + INTERVAL '3 day 13:00',
        NOW() + INTERVAL '3 day 15:00',
        25,
        0,
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (external_id)
    DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        preorder_event_id = EXCLUDED.preorder_event_id,
        slot_start_at = EXCLUDED.slot_start_at,
        slot_end_at = EXCLUDED.slot_end_at,
        capacity = EXCLUDED.capacity,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
    RETURNING id INTO v_slot_b_id;

    INSERT INTO menu_item (
        external_id,
        organization_id,
        preorder_event_id,
        product_id,
        name,
        description,
        price,
        max_per_order,
        is_active,
        sort_order,
        created_at,
        updated_at
    ) VALUES (
        'cccccccc-1111-4444-8888-111111111111',
        v_org_id,
        v_event_id,
        v_product_a_id,
        'Sample Cinnamon Roll Box',
        'Half-dozen cinnamon rolls',
        18.50,
        5,
        TRUE,
        10,
        NOW(),
        NOW()
    )
    ON CONFLICT (external_id)
    DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        preorder_event_id = EXCLUDED.preorder_event_id,
        product_id = EXCLUDED.product_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        max_per_order = EXCLUDED.max_per_order,
        is_active = EXCLUDED.is_active,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW()
    RETURNING id INTO v_menu_item_a_id;

    INSERT INTO menu_item (
        external_id,
        organization_id,
        preorder_event_id,
        product_id,
        name,
        description,
        price,
        max_per_order,
        is_active,
        sort_order,
        created_at,
        updated_at
    ) VALUES (
        'cccccccc-2222-4444-8888-222222222222',
        v_org_id,
        v_event_id,
        COALESCE(v_product_b_id, v_product_a_id),
        'Sample Sourdough Loaf',
        'Classic crusty sourdough loaf',
        8.75,
        8,
        TRUE,
        20,
        NOW(),
        NOW()
    )
    ON CONFLICT (external_id)
    DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        preorder_event_id = EXCLUDED.preorder_event_id,
        product_id = EXCLUDED.product_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        max_per_order = EXCLUDED.max_per_order,
        is_active = EXCLUDED.is_active,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW()
    RETURNING id INTO v_menu_item_b_id;

    INSERT INTO pre_order (
        external_id,
        organization_id,
        preorder_event_id,
        pickup_slot_id,
        name,
        email,
        phone,
        notes,
        status,
        total_amount,
        created_at,
        updated_at
    ) VALUES (
        'dddddddd-1111-4444-8888-111111111111',
        v_org_id,
        v_event_id,
        v_slot_a_id,
        'Test Customer One',
        'test.customer.one@example.com',
        '555-0101',
        'Call on arrival',
        'pending',
        27.25,
        NOW(),
        NOW()
    )
    ON CONFLICT (external_id)
    DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        preorder_event_id = EXCLUDED.preorder_event_id,
        pickup_slot_id = EXCLUDED.pickup_slot_id,
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        notes = EXCLUDED.notes,
        status = EXCLUDED.status,
        total_amount = EXCLUDED.total_amount,
        updated_at = NOW();

    INSERT INTO pre_order (
        external_id,
        organization_id,
        preorder_event_id,
        pickup_slot_id,
        name,
        email,
        phone,
        notes,
        status,
        total_amount,
        created_at,
        updated_at
    ) VALUES (
        'dddddddd-2222-4444-8888-222222222222',
        v_org_id,
        v_event_id,
        v_slot_b_id,
        'Test Customer Two',
        'test.customer.two@example.com',
        '555-0102',
        'Leave at front desk',
        'pending',
        18.50,
        NOW(),
        NOW()
    )
    ON CONFLICT (external_id)
    DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        preorder_event_id = EXCLUDED.preorder_event_id,
        pickup_slot_id = EXCLUDED.pickup_slot_id,
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        notes = EXCLUDED.notes,
        status = EXCLUDED.status,
        total_amount = EXCLUDED.total_amount,
        updated_at = NOW();

END $$;

COMMIT;
