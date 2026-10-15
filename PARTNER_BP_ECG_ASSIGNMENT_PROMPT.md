# Apply in Partner Pro: BP and ECG assignment workflow

Update only BP and ECG booking tiles and their status synchronization. Preserve blood-test bookings, prices, payments, schedules, slot capacity, reports, no-show escalation, and all existing Main App Edge Functions.

## Required Partner tile flow

1. A new BP/ECG order starts pending/confirmed and shows **Accept**.
2. Accept performs one awaited, idempotent mutation to `accepted`. After success, replace Accept with **Assign Service Partner**.
3. Assign opens the existing delivery/collection-person selector. One awaited mutation must save the selected person and synchronize this exact Main App payload:

```json
{
  "status": "partner_assigned",
  "delivery_partner_name": "Assigned person's full name",
  "delivery_partner_phone": "+919876543210"
}
```

Use the Main App order UUID stored as `external_order_id`, and verify the logged-in lab owns the matching `vendor_id`. Never send `completed`, `checked`, `sample_collected`, or `processing` during assignment.

4. Disable Accept/Assign while its request is pending, surface remote errors, and reconcile the tile from the authoritative saved row. A successful action must never require a second click.
5. After assignment, show the assigned person and phone. Hide Accept and Assign unless an explicit reassignment feature already exists.
6. The customer confirms completion in the Main App through the new `confirm-vitals-service` endpoint. BP/ECG finishes as `completed`; there is no report-upload step. This new endpoint saves Main App status only and does not send an event to Partner Pro. Reflect Main App `completed` through the existing authorized server-to-server status read/synchronization path; if absent, add authorized periodic status reconciliation for assigned BP/ECG orders, matching `external_order_id` + `vendor_id`. Change only status, never payment or patient fields, and never resurrect an escalated order. Do not add a receiver without also implementing and verifying its sender. Verify that confirmation reads back in both apps before claiming the integration is complete.
7. Customer **No** continues through the existing no-show cancellation/escalation receiver. Escalated orders remain cancelled and immutable.

## Tests

Test pending → accepted → partner_assigned → completed, assignment failure/retry, duplicate clicks, wrong vendor, missing person details, realtime refresh, and No/no-show. Confirm blood-test assignment and report upload are unchanged.