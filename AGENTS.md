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
- Lab offers arrive on `diagnostic_centers.offers` from the Partner profile sync, and `create-order` checks the chosen offer and works out its discount with the same `supabase/functions/_shared/lab-offers.ts` the checkout screen uses, because a discount decided on the client could be anything.
- A doctor booking exists only once the doctor has it: `create-order` sends it to the Partner `doctor-appointment-webhook` with retries (`_shared/doctor-partner.ts`) and takes the order back if it can't be delivered, because a booking the doctor never sees leaves the patient waiting for a call that won't come.
- Each visit to the doctor booking screen sends its own Idempotency-Key, and `create-order` refuses a second open booking for the same patient name, doctor, type and day, because a key built from user, doctor and day returned the first booking for a second family member and for a booking made again after cancelling.
- The patient tells the doctor what they did with a call (joined, declined, missed) through the Partner `call-signal` function, and cancels through `cancel-order`, which tells the doctor; `update-call-status` refuses to ring a cancelled booking, so the doctor's list corrects itself even if the cancel message was lost.
