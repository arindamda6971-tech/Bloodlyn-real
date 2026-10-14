# Current work

- [x] Add BP/ECG accept → service-partner assignment → customer Yes/No → completion tracking without changing blood-test workflows.
- [ ] Apply BP/ECG Accept/Assign and completion synchronization in Partner Pro (blocked: separate project requires `PARTNER_BP_ECG_ASSIGNMENT_PROMPT.md`).

- [x] Add isolated, secure no-show cancellation with strike/comment and Call Partner UI; preserve Yes and existing Edge Functions.
- [x] Verify no-show UI tests and server authorization; provide Partner Pro receiver/sorting/flag integration prompt (authenticated end-to-end verification unavailable on externally managed Supabase).
- [ ] Apply no-show priority tiles and receiver in Partner Pro (blocked: separate project requires the supplied integration prompt).

- [x] Show a blocking progress state while support tickets are created.
- [x] Keep the Home address heading and full saved address synchronized after navigation and edits.
- [x] Add secure favorite partner labs, a real Profile Saved count, and a Saved Labs page.
- [x] Verify focused lint, TypeScript, tests, production build, and available browser states.
- [x] Replace the lab-test percentage charge with the Admin-managed flat platform fee across checkout and order creation.
- [x] Keep Explore Tests smooth with bounded list mounting and memory-only catalogue caching.
- [x] Enable the existing pull-to-refresh interaction on Home.
- [x] Split each lab profile into General Tests, Specialized Tests, and Health Packages using Partner metadata.
- [x] Prevent mixed General/Specialized carts and require common Partner-configured weekdays for Specialized tests.
- [x] Carry exact sample, preparation, fasting, and report information through test details and cart checkout.
- [x] Refresh Partner test tags on every lab-profile visit and recognize supported Specialized tag variants.
- [x] Calculate and display Partner-managed MRP collection fees once in checkout and verify them server-side.
- [ ] Update Partner Pro profile sync to send active `mrp_delivery_rules` as `delivery_fee_rules` (blocked: apply the supplied prompt in the separate Partner Pro project).
- [x] Split shared Blood Test, ECG, BP, and rescheduling availability into six two-hour collection windows while preserving legacy order tracking.
- [x] Display Partner slot capacity and atomically reject concurrent bookings when a two-hour window is full.
- [x] Route order rescheduling through the same server-side Partner capacity enforcement.
