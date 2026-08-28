# Correct the cross-app order tracking workflow

## Diagnosis
The Partner app currently sends `processing` when a collection partner is assigned. BloodLyn Real classifies `processing` as collection completed, so it hides the Yes/No confirmation and advances the timeline too early. The Partner action also performs two separate writes and its status hook suppresses remote failures, which explains stale tiles and repeated clicks.

## Implementation
1. **Fix BloodLyn Real status interpretation**
   - Treat `processing` from the current Partner integration as “Collection Partner Assigned,” never “Sample Collected.”
   - Only explicit `sample_collected`/collection-complete statuses advance the collection step.
   - Show the assigned partner’s name/phone and the Yes/No prompt immediately after assignment.
   - Keep “No” disabled until the booked slot ends; keep PIN verification for “Yes.”

2. **Make status updates visible immediately**
   - Expand realtime status typing and update the exact React Query cache used by the tracking page.
   - Keep query invalidation as a server-authoritative fallback.
   - Preserve report view/download behavior after `report_ready` or `completed`.

3. **Verify the complete Real-app state machine**
   - Order placed → awaiting lab acceptance.
   - Accepted → awaiting collection-partner assignment.
   - Partner assigned/legacy `processing` → partner details + collection question.
   - Customer confirms Yes with PIN → sample collected.
   - Customer selects No after slot end → collection pending.
   - Report uploaded → report ready with view/download controls.
   - Run focused tests plus the existing test suite and inspect the build signal.

4. **Provide the required Partner-app patch prompt**
   - Use one atomic, awaited mutation per action.
   - Send `accepted` on Accept and `partner_assigned` on Assign; never send `processing` or `sample_collected` during assignment.
   - Disable each action while pending, surface remote failures, and reconcile local state from the server so clicks are never required twice.
   - Expose Upload Report only after `sample_collected`, and preserve report-ready behavior.

## Scope protection
No database migration and no changes to existing booking, payment, scheduling, or unrelated Edge Functions. The existing additive `confirm-collection` function and PIN workflow remain intact.
