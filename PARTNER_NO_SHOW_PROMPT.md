# Apply in Partner Pro

Implement the Partner side of BloodLyn's no-show escalation without modifying existing Yes/sample-collected, billing, booking, assignment or report-upload workflows.

The Main App already atomically cancels the customer's owned, assigned order after its collection slot ends, storing `is_escalated=true`, `escalation_comment`, `cancellation_reason`, `escalated_at`, and `cancelled_at`. The existing Main App Edge Functions are unchanged.

## New isolated receiver

Create `partner-no-show-receiver` in Partner Supabase `wkhwuzsiehrcvlxfeytf`. Accept POST only, validate the existing shared `PARTNER_WEBHOOK_SECRET` through `x-webhook-secret`, include CORS on all responses, and validate input types, UUIDs and a 3–1000 character comment. Never allow a browser user to forge strikes.

Main App sends:

```json
{
  "event": "order.no_show",
  "order_id": "MAIN_ORDER_UUID",
  "external_order_id": "MAIN_ORDER_UUID",
  "vendor_id": "VENDOR_UUID",
  "status": "cancelled",
  "is_escalated": true,
  "escalation_comment": "Exact customer comment",
  "cancellation_reason": "Exact customer comment",
  "escalated_at": "ISO_TIMESTAMP",
  "cancelled_at": "ISO_TIMESTAMP"
}
```

Add escalation fields to `blood_lyn_orders` with secure server-only writes. Match BOTH `external_order_id` and `vendor_id`; update only cancellation/escalation fields (and preserve them within payload). Do not full-upsert an order: never overwrite items, prices, address, patient, assigned partner, reports or payment data. Return `{ "success": true }` only after an existing matching order was durably updated. Missing orders must return a non-success response so delivery stays pending. Repeated deliveries must be idempotent, preserve the original exact comment and timestamp, and never count multiple strikes for one order. Prevent later legacy status syncs from clearing a strike or resurrecting an escalated order.

## Order dashboard

Update `useBloodLynVendor.ts`, `BloodLynOrders.tsx`, home-collection and ECG/BP views where applicable. Carry escalation fields from local rows/payload and Main App order data through all merges. Deduplicate by external order ID, preserving authoritative escalation flags.

Always partition escalated orders ABOVE all ordinary orders before applying normal date sorting. Display them in a pinned urgent section regardless of active/cancelled tab or date filter, with search still able to find them. No alternative sort mode may place normal orders above struck orders.

Use semantic destructive colors for a prominent red border/tint and `Urgent / Cancelled` badge. Add an accessible comment/info icon on the right with a tooltip and a modal showing the exact comment as plain escaped text, preserving line breaks. Never interpret the comment as HTML. Disable assignment, acceptance, report upload and status actions on these cancelled orders. Keep existing role restrictions and ensure only the owning vendor or authorized admin can read them. Confirm real-time updates and all sorting modes.

## Pending delivery and rollout

Deploy the receiver first, then backfill escalated orders from the authorized Main App server integration, matching external order ID plus vendor ID. Main App retains unsent events in a private `no_show_deliveries` queue and retries delivery on repeated authenticated `report-no-show` calls for the same owned escalated order. There is currently NO automatic scheduled retry worker: coordinate replay of pending deliveries or implement a separately secured worker in the Main App project before claiming unattended cross-app delivery. Never request/export service keys to a browser.

Test valid/invalid shared secret, wrong vendor, missing order, duplicate delivery, exact comment preservation, cancelled-order immutability, priority sorting, realtime display, and unaffected Yes/report/payment flows.