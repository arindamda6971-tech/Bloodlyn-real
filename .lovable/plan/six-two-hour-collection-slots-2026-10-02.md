# Six two-hour collection slots

## Build
- Replace the three shared collection windows with six fixed two-hour windows: 6–8 AM, 8–10 AM, 10 AM–12 PM, 12–2 PM, 2–4 PM, and 4–6 PM.
- Keep the same picker across Blood Tests, ECG, BP, and rescheduling.
- Preserve the existing three-day date range, Partner lab open/closed schedule, Specialized-test weekday rules, and one-hour-before-slot-end cutoff.
- Keep older orders compatible so their previous Morning/Afternoon/Evening values still resolve correctly in tracking.
- Update the collection-confirmation timing check to understand the six new windows.

## Verification
- Add boundary tests for all six windows, same-day availability, and legacy order compatibility.
- Run the focused and full test suites, TypeScript checks, lint, and confirm the preview build is healthy.

## Technical details
- The shared slot definition remains the single source used by Blood Tests, ECG, BP, and rescheduling.
- No database migration, pricing logic, Partner schedule endpoint, or unrelated Edge Function will change.
