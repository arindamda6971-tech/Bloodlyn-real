# Fix location onboarding and collection addresses

## Goal
Separate service-area checking from saved collection addresses, while removing the first-login blank screen.

## Changes
1. **Reliable first-login location screen**
   - Load the PIN screen immediately after authentication without waiting on address or lab requests.
   - Remove the route-loading dependency that can leave a new account on a blank screen.
   - Keep serviceability checks retryable and show a clear error instead of a blocked screen.

2. **Temporary service PIN**
   - Store the verified six-digit PIN locally for the signed-in user, not in the `addresses` table.
   - Use that temporary PIN for nearby blood-test, ECG, and BP lab filtering.
   - Keep the existing location-change control able to update this temporary PIN.

3. **Permanent addresses only when complete**
   - Stop creating placeholder rows such as “PIN 721424” after the location check.
   - Treat only full addresses explicitly saved from the cart or Profile > Saved Addresses as permanent addresses.
   - Keep profile address add, edit, delete, and default selection unrestricted.

4. **Cart address completion**
   - If no complete address exists, open a full collection-address form inside the cart flow.
   - Prefill and lock the verified PIN during checkout; allow editing house/flat, street/landmark, city, state, and address type.
   - Save the completed address to the user profile, select it for the order, and keep the existing order payload and partner delivery flow unchanged.
   - Existing complete addresses remain selectable; their address details can be edited during booking while the booking PIN stays fixed.

5. **Compatibility and cleanup**
   - Ignore legacy PIN-only placeholder addresses in booking and saved-address displays so they no longer block checkout.
   - Preserve edge functions, migrations, time-slot logic, pricing, and order creation logic.

## Verification
- Test new signup → PIN screen on first attempt → serviceable PIN → home.
- Confirm no address row is created by the PIN check.
- Test cart with no saved address, save a full address, and complete checkout.
- Test profile add/edit/delete with editable PIN.
- Verify lab filtering follows the active temporary/default address PIN.
- Run targeted tests, type checks, production build, and mobile viewport checks.

## Technical details
- Introduce one user-scoped local service-PIN utility as the shared source for onboarding and lab filtering.
- Update the location gate, `useUserPincode`, home location selector, cart address UI, and saved-address handling only.
- No database schema or Edge Function changes.
