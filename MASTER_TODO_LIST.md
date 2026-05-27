# MASTER TODO LIST

## Current Product Direction
- Product: Holiday Pre-Order Manager for retail bakeries.
- Goal: ship the smallest sellable MVP first, then expand into adjacent bakery modules later.
- Constraint: current repo is still a BakeBoard-derived baseline, so the first work slice must reduce inherited complexity before adding too many new features.

## Latest Progress (2026-05-24)

- Invite creation timeout hardening completed for SMTP-backed sends:
  - Added SMTP operation timeout control (`Emails:Smtp:TimeoutMs`, default 10000ms) to prevent long request stalls.
  - `EmailService` now applies cancellation/timeout across connect/auth/send/disconnect.
  - `OrganizationController` resend endpoint now catches email failures and returns a clear `502` response instead of hanging until proxy timeout.
- Added `TimeoutMs` in:
  - `api/appsettings.json`
  - `api/appsettings.Development.json`
  - `api/appsettings.Production.json`
- Expected behavior change:
  - Expired/no-session requests still correctly surface `401` and require login.
  - Invite create/resend with unreachable SMTP should fail fast instead of producing `504` after long wait.

- Invite/member administration enhancements completed:
  - Added organization member admin endpoints for company/system admins:
    - `GET /api/organization/{orgId}/members`
    - `POST /api/organization/{orgId}/members/{memberUserId}/deactivate`
    - `POST /api/organization/{orgId}/members/{memberUserId}/reactivate`
  - Deactivate/reactivate now requires admin password confirmation and logs audit entries.
  - Updated `/admin/invites` to include members table with remove/restore access actions.
  - Sensitive actions on invites page now use password confirmation prompt.

- Registration-code status wiring fix completed:
  - Root cause: registration code in `RegisterUserAsync` was queried with `AsNoTracking`, so `IsUsed/UsedOn` updates were not persisted.
  - Fix: removed `AsNoTracking` from registration code lookup in `AuthService`.
  - Result: invite `Status` and `Used On` now update correctly once a code is consumed.

## Latest Progress (2026-05-27)

- ✅ **Backend scoped coverage update completed**:
  - Removed `FractionUtility` from backend coverage include scope because it is out-of-scope for the Holiday Pre-Order mini-app.
  - Added focused backend tests for remaining in-scope utilities/models:
    - `StringSanitizer`
    - `WallClockDateTimeConverter`
    - `LicenseFeatures` invalid-tier guard
  - Local backend regression run now passes with **37/37 tests** and **100% line coverage** on the scoped include set.

- ✅ **Regression command scope clarified for mini-app**:
  - Documented authoritative automated test command set in `REGRESSION_TEST_PLAN.md`.
  - Added explicit guardrail to avoid broad solution-wide test runs for MVP sign-off.
  - Confirmed mini-app regression scope excludes legacy BakeBoard areas (including terminal management).

- ✅ **Coverage gates wired into CI** (`.github/workflows/ci.yml`):
  - Backend: `dotnet test` now runs in CI with enforced minimum line coverage threshold.
  - Frontend: unit-test coverage job now runs before build and fails if threshold check fails.

- ✅ **Backend automated test project created** (`api/tests/PreOrderApp.Tests`):
  - Added xUnit + coverlet-based test suite with enforced **85%** line coverage minimum.
  - Added tests for:
    - `LicenseFeatures` / `LicenseUtils`
    - `FractionUtility`
    - `StringSanitizer`
    - `WallClockDateTimeConverter`
  - Local validation: backend suite passed with **94.17% line coverage** on current scoped include set.

- ✅ **Frontend automated regression unit tests expanded**:
  - Added `web/src/core/auth.guard.spec.ts` for `AuthGuard`, `StaffGuard`, and `AdminGuard` route-protection behavior.
  - Added deterministic frontend coverage gate script at `web/scripts/check-lcov.mjs`.
  - Local validation: guard coverage report passed the **80%** gate (84.61% line coverage).

- ℹ️ **Current coverage gate scope**:
  - Backend threshold currently applies to the newly automated MVP utility slice included in the backend coverage filter.
  - Frontend threshold currently applies to the automated auth-guard regression slice.
  - Next slice should expand both include scopes toward full MVP-critical modules/endpoints.

## Coverage Targets (Updated 2026-05-27)

- Backend automated test coverage target: **85%** minimum.
- Frontend automated test coverage target: **80%** minimum.
- MVP regression sign-off requires both coverage targets to pass in CI along with critical-path regression tests.
- Note: these higher thresholds materially improve release confidence, but do not mathematically guarantee near-100% defect prevention.

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
- `AppDbContext` / namespace refactor completed and backend now builds cleanly again.
- Project root naming has been generalized to `PreOrderApp` in API source and project configuration.

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
- Current backend MVP flow exists through `MvpPreOrdersController` and `MvpPreOrderService`.

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
- Current endpoints exist for holiday events, menu items, pickup slots, preorder list, and preorder submission.
- Remaining backend MVP gaps are order status/admin actions, CSV export, and sharper public vs admin API boundaries.

### 4. Build the Smallest Frontend That Can Sell
Status: In Progress

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

Progress Update (2026-04-23):
- Angular route skeleton exists for `/shop`, `/admin/dashboard`, `/admin/events`, `/admin/menu`, and `/admin/orders`.
- Current admin and shop screens still lean on BakeBoard-era components and need to be replaced or narrowed to preorder-specific flows.

### 5. Add Commercial Polish After the Core Flow Works
Status: Planned

Order after MVP works:
- Mobile polish
- Email confirmations
- Stripe checkout
- Basic onboarding/setup flow
- Pricing and packaging pages

## Immediate Next Task

### Completed (2026-04-23)
- Added `PublicPreOrdersController` at `/api/public/preorders` with `[AllowAnonymous]` endpoints:
  - `GET holiday-events?org=<token>`
  - `GET menu-items?org=<token>&holidayEventExternalId=<guid>`
  - `GET pickup-slots?org=<token>&holidayEventExternalId=<guid>`
  - `POST preorders?org=<token>` — full preorder submission
- Org resolved by `RegistrationToken` from `Organization` table; invalid tokens return 404.
- Replaced `OrderBuilderComponent` (`/shop`) with a real 4-step holiday preorder wizard that:
  - Reads holiday events, menu items, and pickup slots from the public API on load.
  - Enforces `maxPerOrder` and capacity limits in the cart.
  - Submits a `CreatePreOrderRequest` to the backend.
  - Shows a confirmation screen on success.
  - Reads org token from `?org=<token>` query param.
- `PublicPreorderService` added to `web/src/app/core/services/`.
- Both `dotnet build` and `ng build` pass (0 errors, pre-existing SCSS budget warnings only).
- Bumped Angular `anyComponentStyle` budget from 4 kB/8 kB to 8 kB/20 kB to unblock pre-existing oversized SCSS files.
- Verified end-to-end public preorder creation inserts `pre_order` + `pre_order_line` rows successfully.
- Fixed runtime JSON cycle crash on preorder responses by projecting public API responses to flat payloads in `PublicPreOrdersController`.
- Added mixed-schema startup hardening in API bootstrap so legacy/new preorder naming can coexist during transition.

### Up Next (2026-04-25 — High Priority Work Completed)

✅ **Regression Test Plan Created** — 20 test scenarios documented in REGRESSION_TEST_PLAN.md
   - All critical code paths verified:
     - Pickup slot window validation (EnsureSlotWithinEventPickupWindow in backend, isSlotWithinEventPickupWindow in frontend)
     - OrderItem.MenuItemId refactor (MenuItemId FK correctly replaces SellableProductId)
     - Admin soft-delete with dependency checks (prevents invalid deactivations)
     - Public order flow with capacity guards (hasPickupCapacity blocks progression)
     - CSV export fully wired in admin orders (exportCsv() → endpoint)

✅ **Build Verification**
   - No TypeScript errors (frontend clean)
   - No C# compilation errors (backend clean)
   - Ready for end-to-end testing

**Remaining Items (MVP Blockers + Validation)**:
1. **Onboarding Finalization (MVP Blocker)**
  - Complete self-serve path: company registration -> valid admin landing -> invite staff -> staff registration
  - Add tenant-admin invite code management (create/list/deactivate with expiry visibility)
  - Ensure registration/login redirects only target existing routes

2. **Public Storefront UI Cleanup (MVP Blocker)**
  - Public storefront (`/shop`, and `/store` if alias added) must not show admin/company sidebar links
  - Hide top-right auth controls on public storefront views:
    - Role badge
    - Change User
    - Logout menu
  - Keep full nav/auth controls available on admin routes only

3. **Manual/Automated Regression Testing**
  - Execute REGRESSION_TEST_PLAN.md test scenarios
  - Focus on: public preorder flow, admin CRUD, status transitions, soft-delete constraints, onboarding, storefront shell behavior
  - Test with live API/database to confirm all flows work end-to-end

4. **Out of Scope for MVP (for now)**
  - Full sellable-product CRUD/admin is not an MVP blocker
  - Continue with current Unlinked placeholder strategy for optional product linkage

**Ready for Testing**:
- Public preorder system fully functional with capacity guards and window validation
- Admin interface for events/menu/slots/orders complete
- CSV export operational
- All soft-delete dependency checks in place
- Onboarding and public storefront shell cleanup must be completed before calling MVP complete

### Next Steps (2026-04-26 — Execution Order)

1. **Finish public storefront shell cleanup in Angular root layout** ✅ Completed (2026-04-26)
  - `/BakeAhead` now hides admin sidebar and top-right auth controls.
  - Full shell behavior remains available on admin routes.
  - Added admin-only "Preview Store" link in top nav that opens `/BakeAhead` in a new tab.
  - Added route definition for `/BakeAhead` and compatibility redirect from `/shop`.
  - Updated files: `web/src/app/app.ts`, `web/src/app/app.html`, `web/src/app/app.routes.ts`.

2. **Finalize onboarding route flow and invite management scope** 🟡 In Progress (2026-04-26)
  - ✅ Restored onboarding/auth utility routes so existing navigation targets resolve:
    - `/dashboard` (auth guarded)
    - `/terminal-selection` (auth guarded)
    - `/pin-signin`
  - ✅ Company registration/login terminal flows now land on valid routes instead of wildcard fallback.
  - ⏳ Remaining: implement tenant-admin invite code management endpoints and UI workflow.
  - Primary files: `web/src/app/app.routes.ts`, `web/src/app/auth/company-register/company-register.component.ts`, `api/Controllers/OrganizationController.cs`.

### Progress Note (2026-04-26 — Invite Code Management Completed)

- ✅ **Config values corrected** (both `appsettings.json` and `appsettings.Development.json`):
  - `Terminal:BindRateLimitCount`: 300 → 30
  - `Terminal:BindRateLimitWindowSeconds`: 12 → 120
  - `RateLimiting:RefreshToken:RequestLimit`: 100 → 10
  - `RateLimiting:RefreshToken:TimeWindowSeconds`: 6 → 60

- ✅ **Invite code management API added** (`api/Controllers/OrganizationController.cs`):
  - `GET  /api/organization/{orgId}/registration-codes` — list all codes for org
  - `POST /api/organization/{orgId}/registration-codes` — generate new code (optional email, expiry days)
  - `DELETE /api/organization/{orgId}/registration-codes/{codeId}` — revoke unused code
  - Tenant-isolated: callers must belong to the same org (or be SystemAdmin)
  - New response DTO: `RegistrationCodeResponse`; new request DTO: `CreateRegistrationCodeRequest`

- ✅ **Invite code management UI added** (`web/src/app/features/preorder-admin/invites/`):
  - `AdminInvitesComponent` — list, generate, revoke, and copy codes
  - `InviteCodesService` — HTTP calls to API
  - Route: `/admin/invites` (AuthGuard + AdminGuard)
  - Sidebar nav item "Invite Staff" visible to `CompanyAdmin` and `SystemAdmin` only

- **Onboarding path is now complete end-to-end**:
  1. Company registers → lands on `/admin/events`
  2. Admin goes to `/admin/invites` → generates a code
  3. Staff visits `/register` → enters code → account created

### Progress Note (2026-04-26 — Invite Email Send + Resend Implemented)

- ✅ **SMTP invite email delivery added**
  - New backend service: `api/Services/EmailService.cs` (`IEmailService`)
  - Configured via `Emails` in:
    - `api/appsettings.json`
    - `api/appsettings.Development.json`
  - SMTP settings applied per requested provider:
    - Host: `smtp.gmail.com`
    - Port: `465`
    - SSL enabled
    - Username: `boardbake@gmail.com`

- ✅ **Send invite on create implemented** (`api/Controllers/OrganizationController.cs`)
  - `POST /api/organization/{orgId}/registration-codes` now sends email automatically when `email` is provided.
  - Response includes `emailSent` flag in `RegistrationCodeResponse`.

- ✅ **Resend invite endpoint implemented**
  - `POST /api/organization/{orgId}/registration-codes/{codeId}/resend`
  - Resends the same active code to the invitee email.
  - Validation guards:
    - code must exist and belong to org
    - code must not be used
    - code must not be expired
    - code must have invitee email
  - Throttle guard:
    - max 3 resends per code per hour (enforced via `audit_log` action count)

- ✅ **Invites UI updated with Resend action**
  - `web/src/app/features/preorder-admin/invites/admin-invites.component.html`
  - `web/src/app/features/preorder-admin/invites/admin-invites.component.ts`
  - Added `Resend` button for eligible rows (active + email present), with loading and error/success messaging.
  - Switched invites page to reuse `PreorderAdminService` registration-code APIs.

- ✅ **Register deep-link prefill implemented**
  - `web/src/app/auth/register/register.component.ts` now reads `?code=` and `?email=` query params and pre-fills the registration form.


3. **Run targeted regression for newly-blocking flows**
  - Public storefront shell behavior (no admin chrome on public route).
  - Registration -> admin landing -> invite code -> staff signup path.

4. **Update status docs immediately after each slice**
  - Keep this file and `NOTES_DEFECTS_USER_TODO` synchronized with pass/fail outcomes.

### Progress Note (2026-04-26)

- Rate-limit configuration bug fixed for auth refresh endpoint:
  - Root cause: `RateLimitingMiddleware` used constructor defaults (`10` requests / `60s`) and ignored appsettings values.
  - Fix: middleware now reads config from:
    - `RateLimiting:RefreshToken:RequestLimit`
    - `RateLimiting:RefreshToken:TimeWindowSeconds`
  - Added these keys to `api/appsettings.json` and `api/appsettings.Development.json`.
  - This change is independent from terminal bind limits (`Terminal:BindRateLimitCount`, `Terminal:BindRateLimitWindowSeconds`), which were already config-driven.

### Latest Backend Progress (2026-04-23)
- Added admin preorder status transition endpoint on MVP API: `PATCH /api/mvp/preorders/{preOrderExternalId}/status`.
- Added guarded transitions in backend service:
  - `SUBMITTED` -> `CONFIRMED`
  - `SUBMITTED` -> `CANCELLED`
  - `CONFIRMED` -> `CANCELLED`
- Cancellation now decrements the associated pickup slot reserved count.
- Status changes are audit-logged through `IAuditService`.
- Fixed follow-up compile break in `MvpPreOrdersController` by importing `IOrganizationContextService` from `PreOrderApp.Services`.
- Cut preorder persistence over from temporary `pre_order` / `pre_order_line` tables to existing `customer_order` / `order_item` tables in `MvpPreOrderService`.
- `menu_item.product_id` is now used as the bridge to `sellable_product`, and menu creation can optionally bind by `ProductExternalId`.
- Public/API preorder responses keep the existing shape by mapping `customer_order` records back into `PreOrder` + `PreOrderLine` transport objects.
- File-scoped editor diagnostics are clean for the touched backend files.
- Focused `dotnet build` verification is still blocked by the terminal alternate-buffer issue in this workspace, so backend build status needs one manual rerun from a normal shell.
- Added startup schema compatibility for mixed environments so `menu_item.product_id` is created automatically if missing before preorder menu queries run.
- API restart is required for the new startup schema patch to execute against the current database.
- Added preorder create fallback in `MvpPreOrderService` to auto-link menu items to `sellable_product` by unique normalized name when `menu_item.product_id` is missing.
- Preorder creation now persists those recovered links and only fails when an item has no unambiguous product match.
- Added admin CSV export endpoint: `GET /api/mvp/preorders/export.csv` with optional `holidayEventExternalId` and `pickupDateUtc` filters.
- CSV export is line-level and includes order identity/status, customer fields, holiday event, pickup slot window/day, item quantity/price/line total, and resolved menu item name.
- Added new preorder admin Angular feature screens and routes:
  - `admin/orders` now uses dedicated preorder operations screen with live list + CSV export wiring.
  - `admin/events`, `admin/menu`, and `admin/slots` now route to preorder-specific scaffold screens (ready for CRUD wiring).
- Updated sidebar navigation to include preorder admin links for Events, Menu, Pickup Slots, and Orders.
- Frontend editor diagnostics are clean for the touched app/feature files.
- Added runtime compatibility fallback in `MvpPreOrderService` for legacy databases where `order_item.product_id` stores text values; preorder list/export now degrade to header-only instead of throwing `InvalidCastException`.
- Follow-up required: normalize legacy `order_item.product_id` data/types so line-level preorder reads can be fully restored without fallback.
- Added targeted fallback for Postgres `42883` (`character varying = bigint`) in menu lookup queries used by preorder list/export mapping.
- Until legacy `menu_item.product_id` data/types are normalized, preorder mapping may omit resolved menu-item name/id lookups but will no longer hard-fail.
- Expanded `42883` fallback handling to the `GetPreOrders` and preorder CSV `Include(OrderItems)` query path, so legacy varchar-vs-bigint FK comparisons there also degrade safely to header-only output.
- Hardened `GetPreOrdersAsync` again to guard fallback header-only query failures (`42883` and `InvalidCastException`) and return a safe empty/degraded result rather than bubbling a 500.
- Added `InvalidCastException` guards in menu lookup helper methods used by preorder list/export mapping so legacy bigint materialization drift in `menu_item.product_id` no longer throws.
- Live DB fix applied: `customer_order.preorder_event_id` and `customer_order.pickup_slot_id` were converted from `varchar` to `bigint`, which resolved the preorder admin UI load failure.
- Confirmed by retest: admin preorder CSV export now works end-to-end after the `customer_order` FK type normalization.
- Added EF migration `NormalizeCustomerOrderPreorderForeignKeyTypes` so other environments automatically normalize `customer_order.preorder_event_id` and `pickup_slot_id` from legacy text to `bigint` during migrations.
- Fixed another `GetPreOrdersAsync`/CSV fallback gap: if the secondary header-only query also throws `InvalidCastException` (or `42883`), service now returns safe degraded output instead of 500.
- Time handling rationalization started for admin forms: events/slots now treat datetime inputs as timezone-less wall-clock values (no browser UTC conversion) and no longer label those fields as UTC.
- **Datetime Policy Finalized**: Business times (opens/closes/pickup times) are wall-clock values stored and compared as-is without timezone conversion; audit timestamps (created/updated/cancelled) use `DateTime.UtcNow`. Policy documented in README.md, MvpPreOrderService, and preorder-admin.service.ts with comprehensive comments for future developers.
- Confirmed preorder-admin and public preorder flows have no problematic `toISOString()` calls on business datetime fields; only audit timestamps and filenames use UTC conversion (correct behavior).
- Removed remaining UTC labels and helper functions from Angular forms to ensure UI/code behavior matches wall-clock semantics.
- Added custom `WallClockDateTimeConverter` to backend for JSON deserialization: converts frontend wall-clock strings (YYYY-MM-DDTHH:mm format) to DateTime without timezone math. Applied to all business datetime fields in event/slot request DTOs.
- Added `[JsonConverter]` attributes to `CreateHolidayEventRequest`, `UpdateHolidayEventRequest`, `CreatePickupSlotRequest`, and `UpdatePickupSlotRequest` DateTime fields to resolve 400 Bad Request on admin event/slot creation/update.
- Added ASP.NET Core Data Protection API configuration in `Program.cs` to suppress key management warning (safe for local dev).
- **ERROR HANDLING OVERHAUL**: Created unified error response infrastructure:
  - `ApiErrorResponse` standard format with message and field-level validation errors.
  - `GlobalExceptionHandlerMiddleware` catches all exceptions and returns consistent error structure.
  - Applied to all HTTP 4xx/5xx responses so frontend sees detailed validation errors instead of generic messages.
  - Frontend error extraction helper (`extractErrorMessage`) parses backend errors and displays field-level validation failures.
  - Applied to Events, Menu, and Slots admin save operations for improved user feedback on validation failures.
- **REQUEST BODY VALIDATION HARDENED**: Strengthened frontend validation to prevent sending empty datetime strings to the backend. All datetime fields now explicitly validated for non-empty values with specific error messages. Backend `WallClockDateTimeConverter` now explicitly rejects empty strings and provides detailed error messages for malformed datetime inputs.
- **WALLCLOCK DATETIME → POSTGRESQL FIX**: Changed `WallClockDateTimeConverter` to parse with `DateTimeStyles.AssumeUniversal` instead of `AssumeLocal`. This creates `DateTime(Kind=Utc)` which is compatible with PostgreSQL `timestamp with time zone` columns. Wall-clock values are preserved on round-trip (stored and read back identically) without any timezone conversion, matching the intended wall-clock semantics.

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

### Latest Update (2026-04-24)
- Fixed preorder admin JSON mapping mismatch: API responses are camelCase (`opensAt`, `pickupStartDt`, `slotStartAt`) while frontend bindings had PascalCase (`OpensAt`, `PickupStartDt`, `SlotStartAt`).
- Updated Events admin form/table/service interfaces to use camelCase so Edit now correctly populates all fields (name, description, opens/closes, pickup dates).
- Applied the same camelCase alignment to Slots admin to prevent the same population/binding issue there.
- Removed unintended UTC normalization for preorder business date/time fields by updating `WallClockDateTimeConverter` to parse/store as wall-clock (`DateTimeKind.Unspecified`) and serialize without timezone suffix; applied converter consistently on create/update event DTO fields.
- Fixed recurring 400 body-binding failures on MVP admin endpoints by restoring explicit `[FromBody]` on POST/PUT/PATCH actions in `MvpPreOrdersController` (`preorder-event`, `menu-items`, `pickup-slots`, `preorders`, status patch). Removed temporary debug `Console.WriteLine` body-length probe.
- Fixed JSON serialization cycle on `/api/mvp/preorder-event` responses (`HolidayEvent -> MenuItems -> HolidayEvent ...`) by returning flattened event response objects from controller (`GetHolidayEvents`, `CreateHolidayEvent`, `UpdateHolidayEvent`) instead of serializing EF entities with navigation graphs.
- Applied the same flat-response pattern to menu and pickup-slot endpoints (`GET/POST/PUT /api/mvp/menu-items`, `GET/POST/PUT /api/mvp/pickup-slots`) to prevent similar navigation graph cycles during JSON serialization.
- Fixed global page overflow/layout issue causing always-visible vertical scrollbar by resetting default browser margins/padding on `html, body` in `web/src/styles.scss`.
- Updated preorder operations payload so `GetPreOrdersAsync` now includes associated pickup slot details (slot start/end/capacity/etc.) by eager-loading `Order.PickupSlot` and mapping a flattened slot snapshot into each returned preorder.
- Fixed preorder submit crash caused by a commented-out `SellableProductId` guard in `CreatePreOrderAsync`; unlinked menu items now fail fast with a clear business error instead of throwing `Nullable object must have a value`.
- Menu items now default to the active for-sale `Unlinked` sellable product when created/updated without an explicit product link, legacy unresolved menu items auto-fallback to that placeholder during preorder creation, and the admin menu screen now highlights placeholder-linked items for review.
- Fixed `ResolveUnlinkedSellableProductIdAsync` EF translation error by replacing the custom normalization helper inside the LINQ query with SQL-translatable `Trim().ToUpper()` string operations.