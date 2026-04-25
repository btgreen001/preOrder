Using the Coding agent and using NOTES_DEFECTS_USER_TODO for quick work referencing, ALWAYS follow instructions at .github/instructions/copilot-instructions.md, 
and always keeping MASTER_TODO_LIST.md updated on progress.

## Datetime Semantics

**Rule: Preorder event/slot times are wall-clock business times, not UTC-converted absolute moments.**

### Business Times (Wall-Clock)
- **Fields**: `HolidayEvent.opensOnUtc`, `closesOnUtc`, `pickupStartDateUtc`, `pickupEndDateUtc`
- **Fields**: `PickupSlot.slotStartUtc`, `slotEndUtc`
- **Semantics**: These represent business-local opening/closing times. They are entered and interpreted as-is by staff, without timezone conversion.
- **Storage**: Stored as `timestamp without time zone` in PostgreSQL (business hours, not absolute moments).
- **UI/Form Entry**: Use HTML `datetime-local` and `date` inputs. **Do not** convert with `toISOString()` in Angular before sending to API.
- **Angular Service**: Treat values as plain strings (YYYY-MM-DD HH:MM or YYYY-MM-DD). No browser timezone math.
- **Backend**: Parse as `DateTime` directly; comparisons use wall-clock semantics (e.g., "is 2:30 PM between open and close?").

### Audit/Operational Timestamps (True UTC)
- **Fields**: `createdAt`, `updatedAt`, `deletedAt`, `AuditLog.*`
- **Semantics**: These record the exact moment an action occurred (UTC absolute).
- **Storage**: Stored as `timestamp with time zone` in PostgreSQL or converted to UTC before insert.
- **UI/Display**: Convert to user timezone only at display boundaries (future enhancement).
- **Backend**: Use `DateTime.UtcNow` or `DateTime.Now.ToUniversalTime()`.

### No Browser Conversion
- Angular forms do **not** call `new Date(value).toISOString()` on business datetime fields.
- Browser `datetime-local` input automatically handles local user representation; the raw input value is the intended wall-clock time.
- Avoid timezone offset math in Angular helpers; keep transformation straightforward (string slice/format only).

### Migration Path
If multi-timezone support is needed later:
1. Add `Organization.timeZone` field.
2. Convert business times at API boundaries (input validation, output formatting).
3. Keep storage as wall-clock (no change to schema for these fields).
4. Document timezone assumption in API endpoint contracts. 
