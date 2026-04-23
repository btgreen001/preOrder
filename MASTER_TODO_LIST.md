# MASTER TODO LIST

## Current Product Direction
- Product: Holiday Pre-Order Manager for retail bakeries.
- Goal: ship the smallest sellable MVP first, then expand into adjacent bakery modules later.
- Constraint: current repo is still a BakeBoard-derived baseline, so the first work slice must reduce inherited complexity before adding too many new features.

## Recommended Starting Point
Start with a focused carve-out phase, not with payments or polished UI.

Reason:
- The API and Angular app still contain inventory, recipe, production, terminal, and other BakeBoard-era surfaces.
- If we build holiday ordering directly on top of that without narrowing the app first, every later feature will inherit extra routing, services, and mental overhead.
- The fastest path is to reduce the system to the preOrder domain, then add the first MVP slice cleanly.

## Stack-Ranked Execution Plan

### 1. Carve Out the preOrder Baseline
Status: In Progress

Scope:
- Identify which backend modules stay for MVP:
  - Auth
  - Holiday Events
  - Menu Items
  - Pre-Orders
  - Admin Operations
- Identify which copied BakeBoard modules are out-of-scope for MVP:
  - Inventory
  - Recipes
  - Production
  - Waste
  - FIFO
  - Terminal management
  - PIN admin
- Replace the frontend route map with a minimal holiday-preorder route skeleton:
  - Public order form
  - Admin login
  - Admin holiday event management
  - Admin menu management
  - Admin orders dashboard

Exit criteria:
- Backend still builds.
- Frontend still builds.
- App navigation reflects preOrder language instead of BakeBoard operations.

Progress Update (2026-04-23):
- Backend audit completed for controllers, services, and models with MVP keep/adapt/remove tagging.
- Frontend route map replacement started with minimal preOrder skeleton.
- Backend MVP slice implementation started for HolidayEvent, MenuItem, PickupSlot, PreOrder, and PreOrderLine.

Backend Audit (MVP Keep / Adapt / Remove)

Controllers
- Keep: `AuthController`, `OrganizationController`
- Adapt: `OrdersController` -> evolve toward preorder admin workflows; `ProductsController` -> evolve toward menu item admin workflows
- Remove (MVP out-of-scope): `BatchesController`, `InventoryController`, `InventoryCheckAvailabilityController`, `InventoryDepletionController`, `InventoryLotController`, `PinAdminController`, `PinController`, `ProductMovementController`, `ProductionDashboardController`, `ProductionTasksController`, `RecipeCompositionsController`, `RecipeIngredientsController`, `RecipeStepController`, `RecipesController`, `TerminalController`, `UnitConversionsController`, `WasteController`

Services
- Keep: `AuthService`, `PasetoTokenService`, `OrganizationService`, `OrganizationContextService`, `OrderService` (short-term compatibility), `ProductService` (short-term compatibility)
- Adapt: `IOrderService`/`OrderService` and `IProductService`/`ProductService` to align naming and contracts with preorders/menu; add dedicated MVP preorder service
- Remove (MVP out-of-scope): `BatchService`, `FIFOService`, `InventoryDepletionService`, `InventoryLotService`, `InventoryService`, `PinAdminService`, `PinService`, `ProductMovementService`, `ProductionDashboardService`, `ProductionTaskService`, `RecipeCompositionService`, `RecipeCostingService`, `RecipeIngredientService`, `RecipeService`, `RecipeStepService`, `TerminalDeviceBindingService`, `TerminalLockService`, `TerminalService`, `UnitConversionService`, `WasteService`

Models
- Keep: `Organization`, `AuthModels`, `LicenseModels`, `AuditLog`
- Adapt: `Order`/`OrderItem` and `SellableProduct` toward preorder-specific naming over time
- Remove (MVP out-of-scope): `FinishedGoodsBatch`, `IngredientTemplate`, `InventoryItem`, `InventoryLot`, `InventoryMovement`, `ProductMovement`, `ProductionTask`, `RecipeComposition`, `RecipeDetail`, `RecipeIngredient`, `RecipeProduct`, `RecipeStep`, `Supplier`, `TerminalModels`, `UnitConversion`, `WasteEvent`, `AdminAuditLog`

### 2. Define the MVP Domain Model
Status: In Progress

Target entities:
- HolidayEvent
- MenuItem
- MenuItemVariant (optional if needed early)
- PickupSlot
- PreOrder
- PreOrderLine
- BakeryTenant or Organization (reuse only if already valuable, otherwise keep single-tenant first)

Decisions to make early:
- Single bakery first or multi-tenant from day one
- Pay-at-pickup only for MVP, with Stripe deferred to next slice unless integration is easy
- Slot capacity rules at slot level, not per-item forecasting yet

Exit criteria:
- Clear API resource list exists.
- DB schema supports one full holiday ordering flow.

Progress Update (2026-04-23):
- MVP entities being implemented in backend: `HolidayEvent`, `MenuItem`, `PickupSlot`, `PreOrder`, `PreOrderLine`.

### 3. Build Backend MVP Slice First
Status: In Progress

Build in this order:
- Holiday event CRUD
- Menu item CRUD
- Pickup slot CRUD and capacity validation
- Public order submission endpoint
- Admin order list endpoint
- CSV export endpoint

Why backend first:
- It fixes the data model before Angular forms calcify around the wrong structure.
- It gives us something testable even while the frontend is being simplified.

Exit criteria:
- API supports creating an event, adding menu items, defining pickup slots, and placing an order.

Progress Update (2026-04-23):
- Implementing CRUD/create-list endpoints for holiday events, menu items, pickup slots, and preorders.

### 4. Build the Smallest Frontend That Can Sell
Status: Planned

Public UX:
- View holiday event
- Select items and quantities
- Choose pickup slot
- Enter customer info
- Submit order

Admin UX:
- Login
- Manage holiday events
- Manage menu items
- View/filter orders
- Export orders

Defer until later:
- Customer accounts
- Complex cart behavior
- Multi-location support
- Automated reminders
- Deep reporting

Exit criteria:
- A bakery can take real seasonal pre-orders end to end.

### 5. Add Commercial Polish After the Core Flow Works
Status: Planned

Order after MVP works:
- Mobile polish
- Email confirmations
- Stripe checkout
- Basic onboarding/setup flow
- Pricing and packaging pages

## Immediate Next Task
The next task should be:

1. Audit backend controllers/services/models and mark each as keep, adapt, or remove for Holiday Pre-Order Manager.
2. Replace the Angular route table with a minimal preOrder route skeleton that matches the MVP scope.
3. Verify backend and frontend still build after the carve-out.

## What We Should Not Start With
- Full payments before order flow exists
- Customer accounts
- Multi-tenant complexity unless clearly needed right now
- Inventory forecasting
- Production lists
- Anything copied from BakeBoard that does not help holiday preorder intake

## Working Principle
If a feature does not help a bakery:
- publish a holiday menu
- accept time-slotted orders
- manage those orders cleanly

then it is not part of the first slice.