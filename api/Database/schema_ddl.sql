-- ============================================================
-- schema_ddl.sql
-- Complete database schema for appdb (preOrder application)
-- Generated: 2026-05-07
-- Purpose: Create all tables and indexes for a fresh database
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────
-- 1. ORGANIZATION
-- ─────────────────────────────────────────────
CREATE TABLE organization (
    organization_id         UUID NOT NULL DEFAULT gen_random_uuid(),
    parent_organization_id  UUID,
    organization_name       TEXT NOT NULL,
    primary_email           TEXT NOT NULL,
    contact_phone           TEXT,
    address_line1           TEXT,
    address_line2           TEXT,
    address_line3           TEXT,
    locality                TEXT,
    region                  TEXT,
    postal_code             TEXT,
    country_code            TEXT,
    registration_token      TEXT NOT NULL,
    is_enabled              BOOLEAN NOT NULL DEFAULT TRUE,
    created_on              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_on             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hash_salt               TEXT,
    CONSTRAINT organization__id__PK PRIMARY KEY (organization_id),
    CONSTRAINT organization__parent_organization__FK
        FOREIGN KEY (parent_organization_id)
        REFERENCES organization(organization_id)
        ON DELETE RESTRICT
);
CREATE UNIQUE INDEX ix_organization_primary_email
    ON organization(primary_email);
CREATE UNIQUE INDEX ix_organization_registration_token
    ON organization(registration_token);
CREATE INDEX organization__parent_organization_id__IX
    ON organization(parent_organization_id);


-- ─────────────────────────────────────────────
-- 2. APP_USER  (SystemUser in C#)
-- ─────────────────────────────────────────────
CREATE TABLE app_user (
    user_id                     UUID NOT NULL DEFAULT gen_random_uuid(),
    email_address               TEXT NOT NULL,
    user_name                   TEXT NOT NULL,
    password_hash               TEXT,
    first_name                  TEXT,
    last_name                   TEXT,
    organization_id             UUID,
    user_role                   TEXT,
    is_enabled                  BOOLEAN NOT NULL DEFAULT TRUE,
    created_on                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_on               TIMESTAMPTZ,
    pin_hash                    TEXT,
    pin_attempts                INT NOT NULL DEFAULT 0,
    pin_locked_until            TIMESTAMPTZ,
    pin_set_on                  TIMESTAMPTZ,
    password_reset_code_hash    TEXT,
    password_reset_code_expires_on TIMESTAMPTZ,
    CONSTRAINT app_user__id__PK PRIMARY KEY (user_id),
    CONSTRAINT organization__app_user__FK
        FOREIGN KEY (organization_id)
        REFERENCES organization(organization_id)
);
CREATE UNIQUE INDEX ix_systemuser_emailaddress ON app_user(email_address);
CREATE UNIQUE INDEX ix_systemuser_username     ON app_user(user_name);
CREATE INDEX        ix_systemuser_organizationid ON app_user(organization_id);


-- ─────────────────────────────────────────────
-- 3. LICENSE_SUBSCRIPTION
-- ─────────────────────────────────────────────
CREATE TABLE license_subscription (
    subscription_id UUID NOT NULL DEFAULT gen_random_uuid(),
    identity_hash   TEXT,
    organization_id UUID,
    tier            TEXT,
    start_date      TIMESTAMPTZ,
    end_date        TIMESTAMPTZ,
    referral_code   TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_on      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_on     TIMESTAMPTZ,
    CONSTRAINT license_subscription__id__PK PRIMARY KEY (subscription_id),
    CONSTRAINT organization__license_subscription__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id)
);
CREATE INDEX ix_licensesubscription_organizationid ON license_subscription(organization_id);
CREATE INDEX ix_licensesubscription_isactive       ON license_subscription(is_active);


-- ─────────────────────────────────────────────
-- 4. REGISTRATION_CODE
-- ─────────────────────────────────────────────
CREATE TABLE registration_code (
    code_id             UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id     UUID,
    registration_code   TEXT,
    created_by_user_id  UUID,
    email               TEXT,
    user_role           TEXT,
    expires_on          TIMESTAMPTZ,
    is_used             BOOLEAN NOT NULL DEFAULT FALSE,
    used_by_user_id     UUID,
    used_on             TIMESTAMPTZ,
    created_on          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT registration_code__id__PK PRIMARY KEY (code_id),
    CONSTRAINT organization__registration_code__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id),
    CONSTRAINT app_user__registration_code_created__FK
        FOREIGN KEY (created_by_user_id) REFERENCES app_user(user_id),
    CONSTRAINT app_user__registration_code_used__FK
        FOREIGN KEY (used_by_user_id) REFERENCES app_user(user_id)
);
CREATE UNIQUE INDEX ix_registrationcode_registrationcode
    ON registration_code(registration_code);
CREATE INDEX ix_registrationcode_organizationid
    ON registration_code(organization_id);


-- ─────────────────────────────────────────────
-- 5. USER_SESSION
-- ─────────────────────────────────────────────
CREATE TABLE user_session (
    session_id      UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID,
    session_token   TEXT,
    ip_address      TEXT,
    user_agent      TEXT,
    created_on      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_accessed_on TIMESTAMPTZ,
    expires_on      TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT user_session__id__PK PRIMARY KEY (session_id),
    CONSTRAINT app_user__user_session__FK
        FOREIGN KEY (user_id) REFERENCES app_user(user_id)
);
CREATE UNIQUE INDEX ix_usersession_sessiontoken ON user_session(session_token);
CREATE INDEX        ix_usersession_userid       ON user_session(user_id);


-- ─────────────────────────────────────────────
-- 6. AUDIT_LOG
-- ─────────────────────────────────────────────
CREATE TABLE audit_log (
    log_id          BIGINT GENERATED ALWAYS AS IDENTITY,
    user_id         UUID,
    organization_id UUID,
    action          VARCHAR(100),
    entity_type     VARCHAR(50),
    entity_id       VARCHAR(255),
    details         TEXT,
    ip_address      VARCHAR(45),
    user_agent      VARCHAR(500),
    "timestamp"     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT audit_log__id__PK PRIMARY KEY (log_id),
    CONSTRAINT app_user__audit_log__FK
        FOREIGN KEY (user_id) REFERENCES app_user(user_id) ON DELETE SET NULL,
    CONSTRAINT organization__audit_log__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id) ON DELETE SET NULL
);


-- ─────────────────────────────────────────────
-- 7. CUSTOMER
-- ─────────────────────────────────────────────
CREATE TABLE customer (
    id              BIGINT GENERATED BY DEFAULT AS IDENTITY,
    external_id     UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    name            VARCHAR(255),
    email           VARCHAR(255),
    phone           VARCHAR(20),
    address         VARCHAR(512),
    city            VARCHAR(100),
    state           VARCHAR(100),
    zip_code        VARCHAR(20),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      UUID,
    updated_by      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version_nbr     INT NOT NULL DEFAULT 1,
    CONSTRAINT customer__id__PK PRIMARY KEY (id),
    CONSTRAINT organization__customer__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id)
);
CREATE UNIQUE INDEX customer__external_id__UIX  ON customer(external_id);
CREATE INDEX        customer__organization_id__IX ON customer(organization_id);


-- ─────────────────────────────────────────────
-- 8. SUPPLIER
-- ─────────────────────────────────────────────
CREATE TABLE supplier (
    id              BIGINT GENERATED BY DEFAULT AS IDENTITY,
    external_id     UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    name            VARCHAR(255),
    email           VARCHAR(255),
    phone           VARCHAR(20),
    address         VARCHAR(255),
    city            VARCHAR(100),
    state           VARCHAR(50),
    zip_code        VARCHAR(20),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by      UUID,
    version_nbr     INT NOT NULL DEFAULT 1,
    CONSTRAINT supplier__id__PK PRIMARY KEY (id),
    CONSTRAINT organization__supplier__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id)
);
CREATE UNIQUE INDEX supplier__external_id__UIX    ON supplier(external_id);
CREATE INDEX        supplier__organization_id__IX ON supplier(organization_id);


-- ─────────────────────────────────────────────
-- 9. ITEM_CATEGORY
-- ─────────────────────────────────────────────
CREATE TABLE item_category (
    id              BIGINT GENERATED BY DEFAULT AS IDENTITY,
    external_id     UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    category_name   VARCHAR(255),
    category_code   VARCHAR(255),
    description     VARCHAR(255),
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by      UUID,
    version_nbr     INT NOT NULL DEFAULT 1,
    CONSTRAINT item_category__id__PK PRIMARY KEY (id),
    CONSTRAINT organization__item_category__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id)
);
CREATE UNIQUE INDEX item_category__external_id__UIX    ON item_category(external_id);
CREATE INDEX        item_category__organization_id__IX ON item_category(organization_id);


-- ─────────────────────────────────────────────
-- 10. PRODUCT_CATEGORY
-- ─────────────────────────────────────────────
CREATE TABLE product_category (
    id              BIGINT GENERATED BY DEFAULT AS IDENTITY,
    external_id     UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    category_name   VARCHAR(255),
    category_code   VARCHAR(255),
    description     VARCHAR(255),
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by      UUID,
    version_nbr     INT NOT NULL DEFAULT 1,
    CONSTRAINT product_category__id__PK PRIMARY KEY (id),
    CONSTRAINT organization__product_category__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id)
);
CREATE UNIQUE INDEX product_category__external_id__UIX    ON product_category(external_id);
CREATE INDEX        product_category__organization_id__IX ON product_category(organization_id);


-- ─────────────────────────────────────────────
-- 11. SELLABLE_PRODUCT
-- ─────────────────────────────────────────────
CREATE TABLE sellable_product (
    id                       BIGINT GENERATED BY DEFAULT AS IDENTITY,
    external_id              UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id          UUID NOT NULL,
    name                     VARCHAR(255) NOT NULL,
    description              TEXT,
    sku                      VARCHAR(100),
    category_id              BIGINT,
    unit_price               NUMERIC(18,2) NOT NULL DEFAULT 0,
    unit_cost                NUMERIC(18,2),
    quantity_on_hand         NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active                BOOLEAN NOT NULL DEFAULT TRUE,
    is_recipe_component      BOOLEAN NOT NULL DEFAULT FALSE,
    is_for_sale              BOOLEAN NOT NULL DEFAULT TRUE,
    output_unit_cnt          NUMERIC(18,6),
    output_unit_msr          VARCHAR(50),
    servings_per_package     NUMERIC(18,4) NOT NULL DEFAULT 1,
    base_units_per_output_unit NUMERIC(18,8),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by               UUID,
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by               UUID,
    version_nbr              INT NOT NULL DEFAULT 1,
    CONSTRAINT sellable_product__id__PK PRIMARY KEY (id),
    CONSTRAINT organization__sellable_product__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id),
    CONSTRAINT product_category__sellable_product__FK
        FOREIGN KEY (category_id) REFERENCES product_category(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX sellable_product__external_id__UIX    ON sellable_product(external_id);
CREATE UNIQUE INDEX sellable_product__sku__UIX            ON sellable_product(sku) WHERE sku IS NOT NULL;
CREATE INDEX        sellable_product__organization_id__IX ON sellable_product(organization_id);


-- ─────────────────────────────────────────────
-- 12. INVENTORY_ITEM
-- ─────────────────────────────────────────────
CREATE TABLE inventory_item (
    id                              BIGINT GENERATED BY DEFAULT AS IDENTITY,
    external_id                     UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id                 UUID NOT NULL,
    name                            VARCHAR(255),
    description                     TEXT,
    sku                             VARCHAR(100),
    warehouse_location              VARCHAR(100),
    quantity_on_hand                NUMERIC(18,2) NOT NULL DEFAULT 0,
    quantity_reserved               NUMERIC(18,2) NOT NULL DEFAULT 0,
    unit_of_measure                 VARCHAR(50),
    default_purchase_unit_of_measure VARCHAR(50),
    default_item_density            NUMERIC(18,8),
    batch_number                    VARCHAR(100),
    expiration_date                 TIMESTAMPTZ,
    unit_cost                       NUMERIC(18,2),
    last_received_at                TIMESTAMPTZ,
    last_used_at                    TIMESTAMPTZ,
    reorder_point                   NUMERIC(18,2),
    reorder_qty                     NUMERIC(18,2),
    supplier_id                     BIGINT,
    last_order_date                 TIMESTAMPTZ,
    is_active                       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                      UUID,
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by                      UUID,
    version_nbr                     INT NOT NULL DEFAULT 1,
    category_id                     BIGINT,
    CONSTRAINT inventory_item__id__PK PRIMARY KEY (id),
    CONSTRAINT organization__inventory_item__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id) ON DELETE RESTRICT,
    CONSTRAINT inventory_item__supplier__FK
        FOREIGN KEY (supplier_id) REFERENCES supplier(id) ON DELETE SET NULL,
    CONSTRAINT inventory_item__category__FK
        FOREIGN KEY (category_id) REFERENCES item_category(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX inventory_item__external_id__UIX       ON inventory_item(external_id);
CREATE INDEX        inventory_item__organization_id__IX    ON inventory_item(organization_id);
CREATE INDEX        inventory_item__reorder_point__IX      ON inventory_item(reorder_point);
CREATE INDEX        inventory_item__expiration_date__IX    ON inventory_item(expiration_date);


-- ─────────────────────────────────────────────
-- 13. INVENTORY_LOT
-- ─────────────────────────────────────────────
CREATE TABLE inventory_lot (
    id                       BIGINT GENERATED BY DEFAULT AS IDENTITY,
    external_id              UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id          UUID NOT NULL,
    inventory_item_id        BIGINT NOT NULL,
    po_id                    TEXT,
    inbound_flg              BOOLEAN,
    expected_qty             NUMERIC(18,4),
    expected_unit_of_measure VARCHAR(50),
    actual_qty               NUMERIC(18,4),
    actual_unit_of_measure   VARCHAR(50),
    discrepancy_reason       VARCHAR(255),
    expiration_date          TIMESTAMPTZ,
    received_date            TIMESTAMPTZ,
    created_by               TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by               TEXT,
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version_nbr              INT NOT NULL DEFAULT 1,
    CONSTRAINT inventory_lot__id__PK PRIMARY KEY (id),
    CONSTRAINT organization__inventory_lot__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id),
    CONSTRAINT inventory_item__inventory_lot__FK
        FOREIGN KEY (inventory_item_id) REFERENCES inventory_item(id)
);
CREATE UNIQUE INDEX inventory_lot__external_id__UIX       ON inventory_lot(external_id);
CREATE INDEX        inventory_lot__organization_id__IX    ON inventory_lot(organization_id);
CREATE INDEX        inventory_lot__inventory_item_id__IX  ON inventory_lot(inventory_item_id);


-- ─────────────────────────────────────────────
-- 14. INVENTORY_MOVEMENT
-- ─────────────────────────────────────────────
CREATE TABLE inventory_movement (
    id                BIGINT GENERATED BY DEFAULT AS IDENTITY,
    external_id       UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL,
    inventory_item_id BIGINT NOT NULL,
    inventory_lot_id  BIGINT,
    movement_type     VARCHAR(50),
    quantity_change   NUMERIC(18,2) NOT NULL DEFAULT 0,
    reason            VARCHAR(255),
    reference_id      VARCHAR(100),
    created_by        UUID,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by        UUID,
    version_nbr       INT NOT NULL DEFAULT 1,
    CONSTRAINT inventory_movement__id__PK PRIMARY KEY (id),
    CONSTRAINT organization__inventory_movement__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id),
    CONSTRAINT inventory_item__inventory_movement__FK
        FOREIGN KEY (inventory_item_id) REFERENCES inventory_item(id),
    CONSTRAINT inventory_lot__inventory_movement__FK
        FOREIGN KEY (inventory_lot_id) REFERENCES inventory_lot(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX inventory_movement__external_id__UIX      ON inventory_movement(external_id);
CREATE INDEX        inventory_movement__organization_id__IX   ON inventory_movement(organization_id);
CREATE INDEX        inventory_movement__inventory_item_id__IX ON inventory_movement(inventory_item_id);


-- ─────────────────────────────────────────────
-- 15. PREORDER_EVENT  (HolidayEvent in C#)
-- ─────────────────────────────────────────────
CREATE TABLE preorder_event (
    id              BIGINT GENERATED ALWAYS AS IDENTITY,
    external_id     UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    name            VARCHAR(200),
    description     TEXT,
    opens_at        TIMESTAMP WITHOUT TIME ZONE,
    closes_at       TIMESTAMP WITHOUT TIME ZONE,
    pickup_start_dt TIMESTAMP WITHOUT TIME ZONE,
    pickup_end_dt   TIMESTAMP WITHOUT TIME ZONE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT preorder_event__id__PK PRIMARY KEY (id),
    CONSTRAINT organization__preorder_event__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id)
);
CREATE UNIQUE INDEX preorder_event__external_id__UIX    ON preorder_event(external_id);
CREATE INDEX        preorder_event__organization_id__IX ON preorder_event(organization_id);


-- ─────────────────────────────────────────────
-- 16. MENU_ITEM
-- ─────────────────────────────────────────────
CREATE TABLE menu_item (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY,
    external_id         UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL,
    preorder_event_id   BIGINT NOT NULL,
    product_id          BIGINT,
    name                VARCHAR(200),
    description         TEXT,
    price               NUMERIC(10,2),
    max_per_order       INT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order          INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT menu_item__id__PK PRIMARY KEY (id),
    CONSTRAINT organization__menu_item__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id),
    CONSTRAINT preorder_event__menu_item__FK
        FOREIGN KEY (preorder_event_id) REFERENCES preorder_event(id),
    CONSTRAINT sellable_product__menu_item__FK
        FOREIGN KEY (product_id) REFERENCES sellable_product(id)
);
CREATE UNIQUE INDEX menu_item__external_id__UIX                 ON menu_item(external_id);
CREATE INDEX        menu_item__organization_preorder_event__IX  ON menu_item(organization_id, preorder_event_id);


-- ─────────────────────────────────────────────
-- 17. PICKUP_SLOT
-- ─────────────────────────────────────────────
CREATE TABLE pickup_slot (
    id                BIGINT GENERATED ALWAYS AS IDENTITY,
    external_id       UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL,
    preorder_event_id BIGINT NOT NULL,
    slot_start_at     TIMESTAMP WITHOUT TIME ZONE,
    slot_end_at       TIMESTAMP WITHOUT TIME ZONE,
    capacity          INT NOT NULL DEFAULT 0,
    reserved_count    INT NOT NULL DEFAULT 0,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pickup_slot__id__PK PRIMARY KEY (id),
    CONSTRAINT organization__pickup_slot__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id),
    CONSTRAINT preorder_event__pickup_slot__FK
        FOREIGN KEY (preorder_event_id) REFERENCES preorder_event(id)
);
CREATE UNIQUE INDEX pickup_slot__external_id__UIX                ON pickup_slot(external_id);
CREATE INDEX        pickup_slot__organization_preorder_event__IX ON pickup_slot(organization_id, preorder_event_id);


-- ─────────────────────────────────────────────
-- 18. CUSTOMER_ORDER  (Order in C#)
-- ─────────────────────────────────────────────
CREATE TABLE customer_order (
    id                      BIGINT GENERATED BY DEFAULT AS IDENTITY,
    external_id             UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL,
    customer_id             BIGINT,
    customer_name           VARCHAR(255),
    customer_email          VARCHAR(255),
    customer_phone          VARCHAR(30),
    preorder_event_id       BIGINT,
    pickup_slot_id          BIGINT,
    delivery_id             BIGINT,
    order_date              TIMESTAMPTZ,
    order_status            VARCHAR(50),
    total_amount            NUMERIC(10,2),
    special_instruction_txt TEXT,
    ordered_at              TIMESTAMPTZ,
    completed_at            TIMESTAMPTZ,
    cancelled_at            TIMESTAMPTZ,
    order_priority          INT,
    created_by              UUID,
    updated_by              UUID,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version_nbr             INT NOT NULL DEFAULT 1,
    CONSTRAINT customer_order__id__PK PRIMARY KEY (id),
    CONSTRAINT organization__customer_order__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id),
    CONSTRAINT customer__customer_order__FK
        FOREIGN KEY (customer_id) REFERENCES customer(id),
    CONSTRAINT preorder_event__customer_order__FK
        FOREIGN KEY (preorder_event_id) REFERENCES preorder_event(id),
    CONSTRAINT pickup_slot__customer_order__FK
        FOREIGN KEY (pickup_slot_id) REFERENCES pickup_slot(id)
);
CREATE UNIQUE INDEX customer_order__external_id__UIX      ON customer_order(external_id);
CREATE INDEX        customer_order__organization_id__IX   ON customer_order(organization_id);
CREATE INDEX        customer_order__customer_id__IX       ON customer_order(customer_id);
CREATE INDEX        customer_order__preorder_event_id__IX ON customer_order(preorder_event_id);
CREATE INDEX        customer_order__status__IX            ON customer_order(order_status);


-- ─────────────────────────────────────────────
-- 19. ORDER_ITEM
-- ─────────────────────────────────────────────
CREATE TABLE order_item (
    id                 BIGINT GENERATED BY DEFAULT AS IDENTITY,
    external_id        UUID NOT NULL DEFAULT gen_random_uuid(),
    customer_order_id  BIGINT NOT NULL,
    product_id         BIGINT,                -- maps to menu_item_id in AppDbContext
    quantity           INT NOT NULL DEFAULT 1,
    unit_price         NUMERIC(18,2),
    customizations     TEXT,
    fulfilled_qty      NUMERIC(18,2),
    order_item_status  VARCHAR(50),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by         UUID,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by         UUID,
    version_nbr        INT NOT NULL DEFAULT 1,
    CONSTRAINT order_item__id__PK PRIMARY KEY (id),
    CONSTRAINT customer_order__order_item__FK
        FOREIGN KEY (customer_order_id) REFERENCES customer_order(id),
    CONSTRAINT menu_item__order_item__FK
        FOREIGN KEY (product_id) REFERENCES menu_item(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX order_item__external_id__UIX  ON order_item(external_id);
CREATE INDEX        order_item__order_id__IX      ON order_item(customer_order_id);
CREATE INDEX        order_item__menu_item_id__IX  ON order_item(product_id);
CREATE INDEX        order_item__status__IX        ON order_item(order_item_status);


-- ─────────────────────────────────────────────
-- 20. PRE_ORDER
-- ─────────────────────────────────────────────
CREATE TABLE pre_order (
    id                BIGINT GENERATED ALWAYS AS IDENTITY,
    external_id       UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL,
    preorder_event_id BIGINT NOT NULL,
    pickup_slot_id    BIGINT,
    name              VARCHAR(255),
    email             VARCHAR(255),
    phone             VARCHAR(20),
    notes             TEXT,
    status            VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_amount      NUMERIC(10,2),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pre_order__id__PK PRIMARY KEY (id),
    CONSTRAINT organization__pre_order__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id),
    CONSTRAINT preorder_event__pre_order__FK
        FOREIGN KEY (preorder_event_id) REFERENCES preorder_event(id),
    CONSTRAINT pickup_slot__pre_order__FK
        FOREIGN KEY (pickup_slot_id) REFERENCES pickup_slot(id)
);
CREATE UNIQUE INDEX pre_order__external_id__UIX                 ON pre_order(external_id);
CREATE INDEX        pre_order__organization_preorder_event__IX  ON pre_order(organization_id, preorder_event_id);


-- ─────────────────────────────────────────────
-- 21. PRE_ORDER_LINE
-- ─────────────────────────────────────────────
CREATE TABLE pre_order_line (
    id           BIGINT GENERATED ALWAYS AS IDENTITY,
    external_id  UUID NOT NULL DEFAULT gen_random_uuid(),
    pre_order_id BIGINT NOT NULL,
    menu_item_id BIGINT NOT NULL,
    quantity     INT NOT NULL DEFAULT 1,
    unit_price   NUMERIC(10,2),
    CONSTRAINT pre_order_line__id__PK PRIMARY KEY (id),
    CONSTRAINT pre_order__pre_order_line__FK
        FOREIGN KEY (pre_order_id) REFERENCES pre_order(id),
    CONSTRAINT menu_item__pre_order_line__FK
        FOREIGN KEY (menu_item_id) REFERENCES menu_item(id)
);
CREATE UNIQUE INDEX pre_order_line__external_id__UIX  ON pre_order_line(external_id);
CREATE INDEX        pre_order_line__pre_order_id__IX  ON pre_order_line(pre_order_id);


-- ─────────────────────────────────────────────
-- 22. RECIPE_DETAIL
-- ─────────────────────────────────────────────
CREATE TABLE recipe_detail (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY,
    external_id         UUID NOT NULL DEFAULT gen_random_uuid(),
    master_id           BIGINT,
    recipe_version_nbr  INT NOT NULL DEFAULT 1,
    recipe_status_cd    VARCHAR(50),
    start_dt            TIMESTAMPTZ,
    end_dt              TIMESTAMPTZ,
    organization_id     UUID NOT NULL,
    product_id          BIGINT,
    approved_by         UUID,
    approved_at         TIMESTAMPTZ,
    recipe_name         VARCHAR(255) NOT NULL,
    description         VARCHAR(2000),
    yield_serving_cnt   INT NOT NULL DEFAULT 1,
    yield_unit          VARCHAR(50),
    units_per_serving   NUMERIC(8,4),
    cost_per_unit       NUMERIC(18,4) NOT NULL DEFAULT 0,
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    prep_time_min       INT,
    active_time_min     INT,
    cook_time_min       INT,
    rest_time_min       INT,
    inactive_time_min   INT,
    total_time_min      INT,
    shelf_life_day_cnt  NUMERIC(3,0),
    created_by          VARCHAR(255) NOT NULL DEFAULT 'system',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by          VARCHAR(255) NOT NULL DEFAULT 'system',
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version_nbr         INT NOT NULL DEFAULT 1,
    CONSTRAINT recipe_detail__id__PK PRIMARY KEY (id),
    CONSTRAINT recipe_detail__recipe_detail_master__FK
        FOREIGN KEY (master_id) REFERENCES recipe_detail(id) ON DELETE RESTRICT,
    CONSTRAINT recipe_detail__sellable_product__FK
        FOREIGN KEY (product_id) REFERENCES sellable_product(id) ON DELETE SET NULL,
    CONSTRAINT recipe_detail__organization__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id)
);
CREATE UNIQUE INDEX recipe_detail__external_id__UIX    ON recipe_detail(external_id);
CREATE INDEX        recipe_detail__organization_id__IX ON recipe_detail(organization_id);
CREATE INDEX        recipe_detail__master_id__IX       ON recipe_detail(master_id);
CREATE INDEX        recipe_detail__approved_by__IX     ON recipe_detail(approved_by);


-- ─────────────────────────────────────────────
-- 23. RECIPE_INGREDIENT
-- ─────────────────────────────────────────────
CREATE TABLE recipe_ingredient (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY,
    external_id                 UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id             UUID NOT NULL,
    recipe_id                   BIGINT NOT NULL,
    inventory_item_id           BIGINT,
    recipe_component_product_id BIGINT,
    quantity_required           NUMERIC(18,4) NOT NULL DEFAULT 0,
    unit                        VARCHAR(50),
    cost_per_unit               NUMERIC(18,4),
    created_by                  VARCHAR(255),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by                  VARCHAR(255),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version_nbr                 INT NOT NULL DEFAULT 1,
    purpose_txt                 TEXT,
    sequence_number             INT,
    is_deleted                  BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT recipe_ingredient__id__PK PRIMARY KEY (id),
    CONSTRAINT recipe_detail__recipe_ingredient__FK
        FOREIGN KEY (recipe_id) REFERENCES recipe_detail(id),
    CONSTRAINT inventory_item__recipe_ingredient__FK
        FOREIGN KEY (inventory_item_id) REFERENCES inventory_item(id),
    CONSTRAINT sellable_product__recipe_ingredient_component__FK
        FOREIGN KEY (recipe_component_product_id) REFERENCES sellable_product(id),
    CONSTRAINT recipe_ingredient__organization__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id)
);
CREATE UNIQUE INDEX recipe_ingredient__external_id__UIX                  ON recipe_ingredient(external_id);
CREATE INDEX        recipe_ingredient__organization_id__IX               ON recipe_ingredient(organization_id);
CREATE INDEX        recipe_ingredient__recipe_id__IX                     ON recipe_ingredient(recipe_id);
CREATE INDEX        recipe_ingredient__inventory_item_id__IX             ON recipe_ingredient(inventory_item_id);
CREATE INDEX        recipe_ingredient__recipe_component_product_id__IX   ON recipe_ingredient(recipe_component_product_id);


-- ─────────────────────────────────────────────
-- 24. RECIPE_COMPOSITION
-- ─────────────────────────────────────────────
CREATE TABLE recipe_composition (
    id               BIGINT GENERATED ALWAYS AS IDENTITY,
    external_id      UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL,
    parent_recipe_id BIGINT NOT NULL,
    sub_recipe_id    BIGINT,
    composition_type VARCHAR(50),
    step_text        VARCHAR(2000),
    section_name     VARCHAR(255),
    sequence_number  INT,
    quantity         NUMERIC(18,4),
    unit             VARCHAR(50),
    is_deleted       BOOLEAN NOT NULL DEFAULT FALSE,
    created_by       VARCHAR(255),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by       VARCHAR(255),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version_nbr      INT NOT NULL DEFAULT 1,
    CONSTRAINT recipe_composition__id__PK PRIMARY KEY (id),
    CONSTRAINT recipe_detail__recipe_composition_parent__FK
        FOREIGN KEY (parent_recipe_id) REFERENCES recipe_detail(id),
    CONSTRAINT recipe_detail__recipe_composition_sub__FK
        FOREIGN KEY (sub_recipe_id) REFERENCES recipe_detail(id),
    CONSTRAINT recipe_composition__organization__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id)
);
CREATE UNIQUE INDEX recipe_composition__external_id__UIX       ON recipe_composition(external_id);
CREATE INDEX        recipe_composition__organization_id__IX    ON recipe_composition(organization_id);
CREATE INDEX        recipe_composition__parent_recipe_id__IX   ON recipe_composition(parent_recipe_id);


-- ─────────────────────────────────────────────
-- 25. RECIPE_STEP
-- ─────────────────────────────────────────────
CREATE TABLE recipe_step (
    id                     BIGINT GENERATED ALWAYS AS IDENTITY,
    external_id            UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id        UUID NOT NULL,
    recipe_detail_id       BIGINT NOT NULL,
    delete_flg             BOOLEAN NOT NULL DEFAULT FALSE,
    step_number            INT NOT NULL DEFAULT 1,
    step_instruction_text  TEXT,
    created_by             TEXT,
    updated_by             TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version_nbr            INT NOT NULL DEFAULT 1,
    CONSTRAINT recipe_step__id__PK PRIMARY KEY (id),
    CONSTRAINT organization__recipe_step__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id),
    CONSTRAINT recipe_detail__recipe_step__FK
        FOREIGN KEY (recipe_detail_id) REFERENCES recipe_detail(id)
);
CREATE UNIQUE INDEX recipe_step__external_id__UIX    ON recipe_step(external_id);
CREATE INDEX        recipe_step__organization_id__IX ON recipe_step(organization_id);


-- ─────────────────────────────────────────────
-- 26. RECIPE_PRODUCT
-- ─────────────────────────────────────────────
CREATE TABLE recipe_product (
    id              BIGINT GENERATED ALWAYS AS IDENTITY,
    external_id     UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    recipe_id       BIGINT NOT NULL,
    product_id      BIGINT NOT NULL,
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
    variation_name  VARCHAR(255),
    notes           VARCHAR(2000),
    created_by      VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by      VARCHAR(255),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version_nbr     INT NOT NULL DEFAULT 1,
    CONSTRAINT recipe_product__id__PK PRIMARY KEY (id),
    CONSTRAINT recipe_detail__recipe_product__FK
        FOREIGN KEY (recipe_id) REFERENCES recipe_detail(id),
    CONSTRAINT sellable_product__recipe_product__FK
        FOREIGN KEY (product_id) REFERENCES sellable_product(id),
    CONSTRAINT recipe_product__organization__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id)
);
CREATE UNIQUE INDEX recipe_product__external_id__UIX    ON recipe_product(external_id);
CREATE INDEX        recipe_product__organization_id__IX ON recipe_product(organization_id);
CREATE INDEX        recipe_product__recipe_id__IX       ON recipe_product(recipe_id);
CREATE INDEX        recipe_product__product_id__IX      ON recipe_product(product_id);


-- ─────────────────────────────────────────────
-- 27. FINISHED_GOODS_BATCH
-- ─────────────────────────────────────────────
CREATE TABLE finished_goods_batch (
    id                BIGINT GENERATED ALWAYS AS IDENTITY,
    external_id       UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL,
    recipe_id         BIGINT,
    product_id        BIGINT,
    quantity_produced NUMERIC(18,4) NOT NULL DEFAULT 0,
    unit              VARCHAR(50),
    production_date   TIMESTAMPTZ,
    expiration_date   TIMESTAMPTZ,
    cost_per_unit     NUMERIC(18,4),
    batch_number      VARCHAR(50),
    status            VARCHAR(50) NOT NULL DEFAULT 'pending',
    quantity_sold     NUMERIC(18,4) NOT NULL DEFAULT 0,
    quantity_wasted   NUMERIC(18,4) NOT NULL DEFAULT 0,
    created_by        VARCHAR(255),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by        VARCHAR(255),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version_nbr       INT NOT NULL DEFAULT 1,
    CONSTRAINT finished_goods_batch__id__PK PRIMARY KEY (id),
    CONSTRAINT recipe_detail__finished_goods_batch__FK
        FOREIGN KEY (recipe_id) REFERENCES recipe_detail(id),
    CONSTRAINT sellable_product__finished_goods_batch__FK
        FOREIGN KEY (product_id) REFERENCES sellable_product(id),
    CONSTRAINT finished_goods_batch__organization__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id)
);
CREATE UNIQUE INDEX finished_goods_batch__external_id__UIX    ON finished_goods_batch(external_id);
CREATE INDEX        finished_goods_batch__organization_id__IX ON finished_goods_batch(organization_id);
CREATE INDEX        finished_goods_batch__recipe_id__IX       ON finished_goods_batch(recipe_id);
CREATE INDEX        finished_goods_batch__product_id__IX      ON finished_goods_batch(product_id);
CREATE INDEX        finished_goods_batch__status__IX          ON finished_goods_batch(status);


-- ─────────────────────────────────────────────
-- 28. WASTE_EVENT
-- ─────────────────────────────────────────────
CREATE TABLE waste_event (
    id                BIGINT GENERATED ALWAYS AS IDENTITY,
    external_id       UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id   UUID NOT NULL,
    batch_id          BIGINT,
    inventory_item_id BIGINT,
    quantity_wasted   NUMERIC(18,4) NOT NULL DEFAULT 0,
    unit              VARCHAR(50),
    waste_reason      VARCHAR(100),
    waste_cost        NUMERIC(18,4),
    recorded_by       VARCHAR(255),
    recorded_at       TIMESTAMPTZ,
    notes             VARCHAR(2000),
    created_by        VARCHAR(255),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by        VARCHAR(255),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version_nbr       INT NOT NULL DEFAULT 1,
    CONSTRAINT waste_event__id__PK PRIMARY KEY (id),
    CONSTRAINT finished_goods_batch__waste_event__FK
        FOREIGN KEY (batch_id) REFERENCES finished_goods_batch(id),
    CONSTRAINT inventory_item__waste_event__FK
        FOREIGN KEY (inventory_item_id) REFERENCES inventory_item(id),
    CONSTRAINT waste_event__organization__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id)
);
CREATE UNIQUE INDEX waste_event__external_id__UIX       ON waste_event(external_id);
CREATE INDEX        waste_event__organization_id__IX    ON waste_event(organization_id);
CREATE INDEX        waste_event__batch_id__IX           ON waste_event(batch_id);
CREATE INDEX        waste_event__inventory_item_id__IX  ON waste_event(inventory_item_id);
CREATE INDEX        waste_event__reason__IX             ON waste_event(waste_reason);


-- ─────────────────────────────────────────────
-- 29. PRODUCT_MOVEMENT
-- ─────────────────────────────────────────────
CREATE TABLE product_movement (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY,
    external_id             UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL,
    sellable_product_id     BIGINT,
    finished_goods_batch_id BIGINT,
    inventory_lot_id        BIGINT,
    po_id                   TEXT,
    movement_type           VARCHAR(50),
    quantity                NUMERIC(18,4) NOT NULL DEFAULT 0,
    unit_of_measure         VARCHAR(50),
    reason                  VARCHAR(255),
    reference_id            VARCHAR(100),
    movement_date           TIMESTAMPTZ,
    created_by              TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by              TEXT,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version_nbr             INT NOT NULL DEFAULT 1,
    CONSTRAINT product_movement__id__PK PRIMARY KEY (id),
    CONSTRAINT organization__product_movement__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id),
    CONSTRAINT sellable_product__product_movement__FK
        FOREIGN KEY (sellable_product_id) REFERENCES sellable_product(id),
    CONSTRAINT finished_goods_batch__product_movement__FK
        FOREIGN KEY (finished_goods_batch_id) REFERENCES finished_goods_batch(id) ON DELETE SET NULL,
    CONSTRAINT inventory_lot__product_movement__FK
        FOREIGN KEY (inventory_lot_id) REFERENCES inventory_lot(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX product_movement__external_id__UIX          ON product_movement(external_id);
CREATE INDEX        product_movement__organization_id__IX       ON product_movement(organization_id);
CREATE INDEX        product_movement__sellable_product_id__IX   ON product_movement(sellable_product_id);
CREATE INDEX        product_movement__batch_id__IX              ON product_movement(finished_goods_batch_id);
CREATE INDEX        product_movement__inventory_lot_id__IX      ON product_movement(inventory_lot_id);
CREATE INDEX        product_movement__movement_type__IX         ON product_movement(movement_type);
CREATE INDEX        product_movement__movement_date__IX         ON product_movement(movement_date);


-- ─────────────────────────────────────────────
-- 30. PRODUCTION_TASK  (no explicit mapping, using PascalCase convention)
-- ─────────────────────────────────────────────
CREATE TABLE "ProductionTasks" (
    "Id"                 BIGINT GENERATED ALWAYS AS IDENTITY,
    "ExternalId"         UUID NOT NULL DEFAULT gen_random_uuid(),
    "OrganizationId"     UUID NOT NULL,
    "RecipeId"           BIGINT,
    "ProductId"          BIGINT,
    "BatchId"            BIGINT,
    "QuantityToProduce"  INT NOT NULL DEFAULT 1,
    "AssignedStaffId"    TEXT,
    "TaskStatus"         TEXT NOT NULL DEFAULT 'Pending',
    "StartTime"          TIMESTAMPTZ,
    "ExpectedCompletion" TIMESTAMPTZ,
    "ActualCompletion"   TIMESTAMPTZ,
    "QualityNotes"       TEXT,
    "CreatedBy"          TEXT NOT NULL DEFAULT 'system',
    "CreatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedBy"          TEXT NOT NULL DEFAULT 'system',
    "UpdatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "PK_ProductionTasks" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_ProductionTasks_organization_OrganizationId"
        FOREIGN KEY ("OrganizationId") REFERENCES organization(organization_id),
    CONSTRAINT "FK_ProductionTasks_recipe_detail_RecipeId"
        FOREIGN KEY ("RecipeId") REFERENCES recipe_detail(id),
    CONSTRAINT "FK_ProductionTasks_sellable_product_ProductId"
        FOREIGN KEY ("ProductId") REFERENCES sellable_product(id),
    CONSTRAINT "FK_ProductionTasks_finished_goods_batch_BatchId"
        FOREIGN KEY ("BatchId") REFERENCES finished_goods_batch(id) ON DELETE SET NULL
);


-- ─────────────────────────────────────────────
-- 31. ADMIN_AUDIT_LOG  (no explicit mapping, using PascalCase convention)
-- ─────────────────────────────────────────────
CREATE TABLE "AdminAuditLogs" (
    "Id"             UUID NOT NULL DEFAULT gen_random_uuid(),
    "OrganizationId" UUID NOT NULL,
    "Action"         TEXT NOT NULL,
    "Details"        TEXT NOT NULL,
    "PerformedBy"    TEXT,
    "LoggedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "PK_AdminAuditLogs" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_AdminAuditLogs_organization_OrganizationId"
        FOREIGN KEY ("OrganizationId") REFERENCES organization(organization_id)
);


-- ─────────────────────────────────────────────
-- 32. TERMINAL
-- ─────────────────────────────────────────────
CREATE TABLE terminal (
    terminal_id     BIGINT GENERATED ALWAYS AS IDENTITY,
    organization_id UUID NOT NULL,
    terminal_code   TEXT NOT NULL,
    location        TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      UUID,
    updated_by      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version_nbr     INT NOT NULL DEFAULT 1,
    terminal_uid    UUID NOT NULL DEFAULT gen_random_uuid(),
    CONSTRAINT terminal__id__PK PRIMARY KEY (terminal_id),
    CONSTRAINT organization__terminal__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id)
);


-- ─────────────────────────────────────────────
-- 33. TERMINAL_DEVICE_BINDING
-- ─────────────────────────────────────────────
CREATE TABLE terminal_device_binding (
    terminal_device_binding_id BIGINT GENERATED ALWAYS AS IDENTITY,
    organization_id            UUID NOT NULL,
    terminal_id                BIGINT NOT NULL,
    device_token               UUID,
    bound_by_user_id           UUID,
    bound_at                   TIMESTAMPTZ,
    last_seen_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unbound_at                 TIMESTAMPTZ,
    unbound_by_user_id         UUID,
    session_id                 UUID,
    is_active                  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT terminal_device_binding__id__PK PRIMARY KEY (terminal_device_binding_id),
    CONSTRAINT organization__terminal_device_binding__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id),
    CONSTRAINT terminal__terminal_device_binding__FK
        FOREIGN KEY (terminal_id) REFERENCES terminal(terminal_id)
);
CREATE INDEX idx_terminal_device_binding_org_token
    ON terminal_device_binding(organization_id, device_token);
CREATE INDEX idx_terminal_device_binding_org_terminal_active
    ON terminal_device_binding(organization_id, terminal_id, is_active);


-- ─────────────────────────────────────────────
-- 34. TERMINAL_SESSION_LOCK
-- ─────────────────────────────────────────────
CREATE TABLE terminal_session_lock (
    terminal_session_lock_id BIGINT GENERATED ALWAYS AS IDENTITY,
    organization_id          UUID NOT NULL,
    terminal_id              BIGINT NOT NULL,
    locked_at                TIMESTAMPTZ,
    session_begin_at         TIMESTAMPTZ,
    session_end_at           TIMESTAMPTZ,
    locked_by_user_id        UUID,
    status_cd                TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at         TIMESTAMPTZ,
    CONSTRAINT terminal_session_lock__id__PK PRIMARY KEY (terminal_session_lock_id),
    CONSTRAINT terminal__terminal_session_lock__FK
        FOREIGN KEY (terminal_id) REFERENCES terminal(terminal_id)
);


-- ─────────────────────────────────────────────
-- 35. ORGANIZATION_SETTING
-- ─────────────────────────────────────────────
CREATE TABLE organization_setting (
    organization_setting_id BIGINT GENERATED ALWAYS AS IDENTITY,
    organization_id         UUID NOT NULL,
    setting_key             TEXT NOT NULL,
    setting_value           TEXT,
    created_by              UUID,
    updated_by              UUID,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version_nbr             INT NOT NULL DEFAULT 1,
    CONSTRAINT organization_setting__id__PK PRIMARY KEY (organization_setting_id),
    CONSTRAINT organization__organization_setting__FK
        FOREIGN KEY (organization_id) REFERENCES organization(organization_id)
);


-- ─────────────────────────────────────────────
-- 36. UNIT_CONVERSION
-- ─────────────────────────────────────────────
CREATE TABLE unit_conversion (
    unit_conversion_id BIGINT GENERATED ALWAYS AS IDENTITY,
    external_id        UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id    UUID,
    from_unit          TEXT NOT NULL,
    to_unit            TEXT NOT NULL,
    conversion_factor  NUMERIC(18,8) NOT NULL,
    category           TEXT,
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by         TEXT,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by         TEXT,
    version_nbr        INT NOT NULL DEFAULT 1,
    CONSTRAINT unit_conversion__id__PK PRIMARY KEY (unit_conversion_id)
);
CREATE UNIQUE INDEX unit_conversion__external_id__UIX
    ON unit_conversion(external_id);
CREATE UNIQUE INDEX unit_conversion__organization_id_from_unit_to_unit__UIX
    ON unit_conversion(organization_id, from_unit, to_unit);


-- ─────────────────────────────────────────────
-- 37. INGREDIENT_TEMPLATE  (no explicit mapping, using PascalCase convention)
-- ─────────────────────────────────────────────
CREATE TABLE "IngredientTemplates" (
    "IngredientTemplateId" BIGINT GENERATED ALWAYS AS IDENTITY,
    "Name"                 TEXT NOT NULL,
    "Sku"                  TEXT,
    "Category"             TEXT,
    "UnitOfMeasure"        TEXT NOT NULL DEFAULT 'lb',
    "TypicalUnitCost"      NUMERIC(18,4),
    "IsActive"             BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "PK_IngredientTemplates" PRIMARY KEY ("IngredientTemplateId")
);


-- ─────────────────────────────────────────────
-- 38. __EFMigrationsHistory (EF Core tracking table)
-- ─────────────────────────────────────────────
CREATE TABLE __EFMigrationsHistory (
    "MigrationId"      VARCHAR(150) NOT NULL,
    "ProductVersion"   VARCHAR(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);


-- ============================================================
-- LEGACY PASCALCASE TABLES (from InitialCreate migration)
-- These tables are created by the first migrations and are
-- kept for backward compatibility and migration history.
-- ============================================================

-- ─────────────────────────────────────────────
-- L1. Organization (PascalCase legacy)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Organization" (
    "OrganizationId"      UUID NOT NULL,
    "OrganizationName"    TEXT NOT NULL,
    "PrimaryEmail"        TEXT NOT NULL,
    "AddressLine1"        TEXT,
    "AddressLine2"        TEXT,
    "AddressLine3"        TEXT,
    "Locality"            TEXT,
    "Region"              TEXT,
    "PostalCode"          TEXT,
    "CountryCode"         TEXT,
    "RegistrationToken"   TEXT NOT NULL,
    "IsEnabled"           BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedOn"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "ModifiedOn"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "ParentOrganizationId" UUID,
    "HashSalt"            TEXT,
    CONSTRAINT "PK_Organization" PRIMARY KEY ("OrganizationId")
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Organization_PrimaryEmail" ON "Organization"("PrimaryEmail");
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Organization_RegistrationToken" ON "Organization"("RegistrationToken");


-- ─────────────────────────────────────────────
-- L2. Order (PascalCase legacy)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Order" (
    "Id"             UUID NOT NULL,
    "OrganizationId" UUID NOT NULL,
    "CustomerName"   TEXT,
    "OrderDate"      TIMESTAMPTZ NOT NULL,
    CONSTRAINT "PK_Order" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_Order_Organization_OrganizationId"
        FOREIGN KEY ("OrganizationId") REFERENCES "Organization"("OrganizationId") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "IX_Order_OrganizationId" ON "Order"("OrganizationId");


-- ─────────────────────────────────────────────
-- L3. SystemUser (PascalCase legacy)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SystemUser" (
    "UserId"                     UUID NOT NULL,
    "EmailAddress"               TEXT NOT NULL,
    "UserName"                   TEXT NOT NULL,
    "PasswordHash"               TEXT,
    "FirstName"                  TEXT,
    "LastName"                   TEXT,
    "OrganizationId"             UUID,
    "UserRole"                   TEXT,
    "IsEnabled"                  BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedOn"                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "LastLoginOn"                TIMESTAMPTZ,
    "PinHash"                    TEXT,
    "PinAttempts"                INT NOT NULL DEFAULT 0,
    "PinLockedUntil"             TIMESTAMPTZ,
    "PinSetOn"                   TIMESTAMPTZ,
    "PasswordResetCodeHash"      TEXT,
    "PasswordResetCodeExpiresOn" TIMESTAMPTZ,
    CONSTRAINT "PK_SystemUser" PRIMARY KEY ("UserId"),
    CONSTRAINT "FK_SystemUser_Organization_OrganizationId"
        FOREIGN KEY ("OrganizationId") REFERENCES "Organization"("OrganizationId")
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_SystemUser_EmailAddress" ON "SystemUser"("EmailAddress");
CREATE UNIQUE INDEX IF NOT EXISTS "IX_SystemUser_UserName" ON "SystemUser"("UserName");
CREATE INDEX IF NOT EXISTS "IX_SystemUser_OrganizationId" ON "SystemUser"("OrganizationId");

COMMIT;
