# PreOrder Regression Test Plan (2026-04-25)

## Test Scope
Verify critical end-to-end flows after recent feature implementations:
- Pickup slot window validation
- OrderItem MenuItemId refactor
- Admin soft-delete with dependency checks
- Public order flow with capacity guards

---

## PUBLIC PREORDER FLOW (High Priority)

### Test 1: Event Selection → No Capacity Warning
**Scenario**: Select an event with no available pickup slots (reserved >= capacity for all slots)
**Expected**: 
- ✓ Pickup availability warning displayed on Step 1
- ✓ Add buttons disabled
- ✓ nextStep() blocked if no capacity exists
**Pass/Fail**: ___

### Test 2: Event Selection → With Capacity
**Scenario**: Select an event with available slots
**Expected**:
- ✓ No warning displayed
- ✓ Add buttons enabled
- ✓ First available slot pre-selected
**Pass/Fail**: ___

### Test 3: Full Order Submission
**Scenario**: Complete all 4 steps (items → info → slot → review → submit)
**Steps**:
1. Select event with available menu items
2. Add 2+ items to cart (test maxPerOrder enforcement)
3. Enter customer info (name, email, phone)
4. Select pickup slot
5. Review order details
6. Submit preorder
**Expected**:
- ✓ Order confirmation screen appears
- ✓ Confirmation ID displayed
- ✓ Customer name/email/total shown
- ✓ Order stored in database (GET /api/mvp/preorders returns it)
**Pass/Fail**: ___

### Test 4: Cart Management
**Scenario**: Test add/update/remove operations
**Expected**:
- ✓ Adding same item increases quantity (respects maxPerOrder)
- ✓ Updating quantity works correctly
- ✓ Removing item deletes from cart
- ✓ Cart total recalculates
**Pass/Fail**: ___

### Test 5: Invalid Token Handling
**Scenario**: Access with invalid/missing org token
**Expected**:
- ✓ Load error message displayed
- ✓ "missing the bakery organization token" message shown
- ✓ No API calls made
**Pass/Fail**: ___

---

## ADMIN CRUD FLOWS (High Priority)

### Test 6: Create Holiday Event
**Scenario**: Admin creates new event
**Expected**:
- ✓ POST /api/mvp/preorder-event succeeds
- ✓ Event appears in events list
- ✓ opensAt/closesAt stored as wall-clock (no UTC conversion)
**Pass/Fail**: ___

### Test 7: Edit Holiday Event
**Scenario**: Admin edits existing event
**Expected**:
- ✓ Form loads with camelCase keys (opensAt, closesAt, pickupStartDt, pickupEndDt)
- ✓ PUT /api/mvp/preorder-event succeeds
- ✓ Changes reflected in list
**Pass/Fail**: ___

### Test 8: Create Menu Item
**Scenario**: Admin creates menu item without explicit product link
**Expected**:
- ✓ Auto-assigns "Unlinked" placeholder product
- ✓ Menu item appears in menu list
- ✓ Warning badge displayed on unlinked items
**Pass/Fail**: ___

### Test 9: Create Pickup Slot
**Scenario**: Admin creates slot within event pickup window
**Expected**:
- ✓ Slot times within event window (PickupStartDt ≤ SlotStartAt, SlotEndAt ≤ PickupEndDt)
- ✓ POST /api/mvp/pickup-slots succeeds
- ✓ Slot appears in list
**Pass/Fail**: ___

### Test 10: Create Pickup Slot (Out of Window)
**Scenario**: Admin tries to create slot outside event window
**Expected**:
- ✓ Frontend validation blocks save
- ✓ Error message: "Slot times must fit within event pickup window"
- ✓ API also rejects if frontend validation bypassed
**Pass/Fail**: ___

### Test 11: Soft-Delete Event (No Preorders)
**Scenario**: Deactivate event with no orders
**Expected**:
- ✓ Deactivate button triggers confirmation dialog
- ✓ PUT /api/mvp/preorder-event with isActive=false succeeds
- ✓ Event marked inactive (no longer appears in public)
**Pass/Fail**: ___

### Test 12: Soft-Delete Event (With Preorders)
**Scenario**: Try to deactivate event with active preorders
**Expected**:
- ✓ API returns error (dependency check)
- ✓ Error message displayed to admin
- ✓ Event remains active
**Pass/Fail**: ___

### Test 13: Soft-Delete Menu Item (With Orders)
**Scenario**: Try to deactivate menu item used in existing orders
**Expected**:
- ✓ API returns error
- ✓ Admin sees error message
- ✓ Item remains active
**Pass/Fail**: ___

### Test 14: Soft-Delete Pickup Slot (With Reservations)
**Scenario**: Try to deactivate slot with reserved orders
**Expected**:
- ✓ API returns error showing reserved count
- ✓ Slot remains active
**Pass/Fail**: ___

---

## ORDER ITEM REFACTOR (MenuItemId) (High Priority)

### Test 15: OrderItem Uses MenuItemId (Not SellableProductId)
**Scenario**: Query order from admin list
**Expected**:
- ✓ OrderItem.MenuItemId FK points to MenuItem
- ✓ Order payload includes menu item name/description
- ✓ If MenuItem.SellableProductId changes later, order still tracks original menu item
**Pass/Fail**: ___

### Test 16: OrderItem Includes Pickup Slot
**Scenario**: Query preorder via GET /api/mvp/preorders
**Expected**:
- ✓ Order response includes pickupSlot object
- ✓ Slot times/capacity visible in admin
- ✓ CSV export includes slot start/end/day
**Pass/Fail**: ___

---

## ADMIN PREORDER OPERATIONS

### Test 17: CSV Export with Filters
**Scenario**: Admin exports orders with optional event/date filters
**Expected**:
- ✓ GET /api/mvp/preorders/export.csv?holidayEventExternalId=X succeeds
- ✓ CSV file downloads with correct name
- ✓ Rows include customer, items, quantities, slot info
**Pass/Fail**: ___

### Test 18: Status Transitions
**Scenario**: Admin changes order status (SUBMITTED → CONFIRMED → CANCELLED)
**Expected**:
- ✓ PATCH /api/mvp/preorders/{id}/status succeeds
- ✓ Status reflected in list
- ✓ Cancellation decrements pickup slot reserved count
**Pass/Fail**: ___

---

## BUILD VERIFICATION

### Test 19: Frontend Build
**Command**: `npm run build` in `/web/`
**Expected**: ✓ No TS errors, bundle completes
**Pass/Fail**: ___

### Test 20: Backend Build
**Command**: `dotnet build` in `/api/`
**Expected**: ✓ No compilation errors
**Pass/Fail**: ___

---

## Test Summary
- **Total Tests**: 20
- **Passed**: ___
- **Failed**: ___
- **Blockers**: None / (list any)

---

## Notes
- All business times (opens/closes/pickup window/slot times) use wall-clock semantics (DateTimeKind.Unspecified)
- OrderItem now stores MenuItemId to preserve order intent if product link changes
- Soft-delete via isActive flag with dependency checks prevents invalid deactivations
- Pickup slots must fit within event's pickup window (both UI and API validation)
