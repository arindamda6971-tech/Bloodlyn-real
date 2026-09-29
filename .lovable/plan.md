# Sync Partner collection fees into checkout

## Goal
Apply each selected lab’s active MRP-based collection-fee rule to BloodLyn checkout, using the test MRP before discounts, and charge it exactly once.

## Changes
- Add a small validated fee-rule utility that accepts Partner rule JSON, ignores inactive/invalid rows, and selects one matching rule deterministically.
- Fetch the selected lab’s latest `delivery_fee_rules` when checkout opens and whenever the selected lab changes.
- Replace the hardcoded “Home Collection — FREE” display with the matched fee, while retaining “FREE” only when the matched fee is ₹0 or no valid synced rule applies.
- Add the collection fee once to the payable amount after discounts and alongside the existing flat platform fee.
- Include the computed fee in checkout success state so the order confirmation arithmetic remains transparent.
- Recalculate the collection fee inside `create-order` from the authoritative selected lab record and server-validated MRP subtotal; never trust a client-provided fee.
- Return the authoritative collection fee from order creation and use the server-returned total/fees on the success page.
- Preserve all test pricing, offers, add-ons, authentication, booking, schedules, payment behavior, and unrelated Edge Functions.

## Partner Pro requirement
- Update `blood-lyn-sync/profile` to query active `mrp_delivery_rules` for the current lab and send them as `diagnostic_centers.delivery_fee_rules`.
- Keep fields as `{ min_mrp, max_mrp, fee, is_active }`, ordered by `min_mrp`.
- Ensure add/update/delete and the manual “Sync to Bloodlyn” action await this profile sync and surface failures instead of silently reporting success.

## Verification
- Test rule parsing, exact boundaries, open-ended ranges, overlap handling, inactive/invalid rules, and no-match fallback.
- Verify the checkout row and payable total for the supplied ₹1,294 example.
- Verify server-side order totals match the displayed collection and platform fees.
- Run focused tests, type checks, lint, and confirm the preview build is healthy.
