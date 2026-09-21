# Admin-managed flat platform fee

## Goal
Replace the percentage-based checkout platform charge with the Admin panel’s flat lab-test fee, applied exactly once.

## Changes
- Fetch `bridge-settings` with GET through the existing secure bridge path, backed by the Admin publishable key stored as a runtime secret.
- Read `data.lab_test_platform_fee_flat`, accept only finite non-negative numbers, and fall back to ₹0 when missing or unavailable.
- Refresh the value whenever checkout opens instead of relying on a stale cached percentage.
- Show one “Platform fee” row in the final bill summary, including ₹0 when unavailable.
- Add the flat fee once after existing prices and discounts, while preserving collection fees, offers, wallet use, and payment flow.
- Recalculate the same flat fee server-side during order creation so stored and Partner totals remain authoritative and tamper-resistant.
- Carry the fee to the order-success summary so its arithmetic remains transparent.
- Remove the old percentage/convenience-fee code and labels without changing unrelated Edge Functions or booking logic.

## Verification
- Add focused tests for valid, invalid, missing, and nested Admin responses.
- Run TypeScript checks, the full automated test suite, production build, and focused lint.
- Check the checkout UI and final total in the preview where authentication permits.
