# Add BP and ECG partner-assignment confirmation

## User experience
1. Keep order placement and Partner acceptance unchanged.
2. After acceptance, show that the lab is assigning a service partner.
3. When Partner Pro assigns the person, show their name and phone in BloodLyn tracking.
4. Show the same Yes/No confirmation pattern used for blood collection, with BP/ECG-specific wording.
5. “Yes” completes the BP/ECG order immediately; no report upload is expected.
6. “No” keeps the existing slot-end restriction, Call Partner, and Report Lab escalation flow.

## Technical implementation
- Extend the existing tracking state interpretation for BP/ECG without changing blood-test status behavior.
- Add a separate authenticated BP/ECG completion Edge Function instead of changing existing confirmation, booking, payment, or no-show functions.
- Validate ownership, BP/ECG order type, assigned state, and idempotency before marking an order `completed`.
- Preserve realtime cache updates so partner details and completion appear without refresh.
- Provide a Partner Pro prompt for the Accept and Assign actions, assignment payload fields, and optional completion receiver.

## Verification
- Add focused tests for pending, accepted, assigned, completed, and No/no-show BP/ECG states.
- Run the relevant test suite and inspect the preview build signal.

## Scope protection
No database migration. No changes to order creation, pricing, payments, schedules, slot capacity, blood-test confirmation, report upload, or no-show server logic.
