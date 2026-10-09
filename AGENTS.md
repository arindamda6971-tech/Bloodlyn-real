# Project architecture rules

- Route no-show reports through a separate authenticated endpoint and row-locked transaction with a durable Partner delivery queue, because existing confirmation functions and financial workflows must remain unchanged.

- Keep large Admin test catalogues in React Query memory rather than synchronous localStorage persistence, because serialization blocks mobile route transitions.
- Persist Partner test availability and preparation metadata with cart items, because specialized-day validation must survive navigation and signed-in cart restoration.
- Calculate collection fees from the selected lab's synced Partner MRP rules on both checkout and `create-order`, because the server must remain authoritative and charge the fee exactly once.
- Define the six two-hour collection windows centrally in `lab-slots`, because Blood Tests, ECG, BP, rescheduling, and tracking must use identical boundaries.
- Enforce Partner slot capacities inside a database-locked server operation keyed by vendor, date, and normalized slot, because client checks cannot prevent concurrent overbooking.