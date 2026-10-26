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
- Load the Admin test catalogue once (`all=true`, memory-only query) and search it on-device with the concept/typo engine in `lib/test-search`, building its index in yielding slices, because per-category paging capped lists at 500 tests and per-keystroke proxy searches hit the shared rate limit.
- Send every test "Add" through the shared `LabPickerSheet`, because a test may enter the cart only with a nearby lab that offers it, at that lab's price.