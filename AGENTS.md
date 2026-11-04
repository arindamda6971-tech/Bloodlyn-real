# Project architecture rules

- Keep the cached Home viewport on one stable compositor layer, pause its CSS animations while inactive or transitioning, and skip offscreen section painting; preserve visibility before paint so Home navigation does not flash or rasterize every card during a slide.

- Complete BP/ECG orders through a dedicated authenticated confirmation endpoint after service-partner assignment, because on-site vitals need no report-upload stage and blood-test confirmation must remain unchanged.

- Route no-show reports through a separate authenticated endpoint and row-locked transaction with a durable Partner delivery queue, because existing confirmation functions and financial workflows must remain unchanged.

- Keep large Admin test catalogues in React Query memory rather than synchronous localStorage persistence, because serialization blocks mobile route transitions.
- Persist Partner test availability and preparation metadata with cart items, because specialized-day validation must survive navigation and signed-in cart restoration.
- Calculate collection fees from the selected lab's synced Partner MRP rules on both checkout and `create-order`, because the server must remain authoritative and charge the fee exactly once.
- Define the six two-hour collection windows centrally in `lab-slots`, because Blood Tests, ECG, BP, rescheduling, and tracking must use identical boundaries.
- Enforce Partner slot capacities inside a database-locked server operation keyed by vendor, date, and normalized slot, because client checks cannot prevent concurrent overbooking.
- Render one app-wide bottom bar outside the sliding page layers and switch bottom tabs with a short fade-through that removes the outgoing tab at once, because per-page bars slid in stacked and sliding tabs kept several full screens mounted until the WebView froze.
- A lab collects at its own address PIN plus its Partner service PINs, checked by one shared `labServesPincode` in `supabase/functions/_shared/service-area.ts` for screens and `create-order`, because separate copies drifted and told patients a PIN was served while listing no labs.
- Patients cancel or reschedule only through cancel-order and reschedule-order, and only until a collection partner is assigned; a booking moves only to the next day after it that the lab is open with free times. A database guard blocks app users from changing booking fields and keeps cancelled orders cancelled, because direct table writes skipped the capacity and stage rules.
