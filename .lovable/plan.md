# Partner slot-capacity enforcement

## Build
- Extend `lab-slots` to read Partner Pro `slot_capacities`, normalize all six two-hour windows, and return each date/slot's capacity, booked count, and remaining places.
- Count only non-cancelled BloodLyn orders for the same Partner vendor, date, and normalized slot; capacity `0` makes that slot unavailable.
- Update Blood Test, ECG, and BP pickers to display remaining places and disable sold-out slots while preserving existing day, fasting, and cutoff rules.
- Revalidate Partner capacity inside `create-order` and insert through a database transaction lock, so simultaneous checkouts cannot overbook.
- Return a clear capacity error when a slot fills between selection and checkout; keep idempotent retries unchanged.

## Verification
- Add normalization and capacity tests, including capacity zero, cancellations, and sold-out behavior.
- Test both Edge Functions, deploy them, and verify successful slot responses plus rejected over-capacity requests.
- Run the complete frontend test suite, type checks, lint, and preview build checks.

## Technical details
- Partner Pro remains the source of capacity configuration; BloodLyn orders remain the source of booked counts.
- The database lock is scoped to vendor + date + normalized two-hour slot and is callable only by the server role.
- Rescheduling will also require the same protected server-side operation; direct client updates cannot safely enforce concurrent capacity.
