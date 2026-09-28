# General and Specialized Lab Tests

## Goal
Add separate General Tests and Specialized Tests areas inside each existing Blood Lab profile, using the configuration already synchronized from the Partner Portal. Preserve the current Lab → Cart → Lab Selection → Payment → Order flow and all unrelated behavior.

## User experience
- Keep the current lab profile, banner, schedule, offers, search, categories, health packages, pricing, and test-detail navigation intact.
- Within the lab’s test catalogue, add clear **General Tests** and **Specialized Tests** sections/tabs.
- General tests continue through the current booking flow without additional date restrictions.
- Specialized tests show their available weekdays and only allow booking on Partner-configured days.
- Show each test’s exact Partner-provided sample type, preparation instruction, fasting instruction, and report type where available.
- Missing legacy availability metadata is treated as General for backward compatibility; a test is Specialized only when explicitly configured as `SPECIALIZED`.

## Booking rules
- Preserve the existing single-lab cart restriction.
- Allow General + General.
- Allow Specialized + Specialized only when their configured weekdays have at least one common day.
- Block General + Specialized without replacing or clearing the cart, with a clear explanation.
- Block a Specialized test that has no valid configured day.
- For multiple Specialized tests, calculate the intersection of their valid weekdays and disable every other date in the existing date selector.
- Continue combining the lab’s open schedule, the existing three-day booking window, current time slots, and the one-hour cutoff. A date is selectable only when both the lab and every selected Specialized test permit it.

## Implementation
- Extend the existing lab product mapping to carry:
  - `availability_type`
  - `available_days`
  - `sample_type`
  - `preparation_required` / `preparation_instruction`
  - `fasting_required` / `fasting_instruction`
  - `report_type`
- Add a small shared utility for normalizing availability types/weekdays and computing common Specialized days.
- Extend the existing cart item metadata and Supabase cart synchronization so classification and requirements survive refreshes; use a minimal migration only for these additive cart metadata fields, with existing owner-only RLS and explicit grants preserved.
- Enforce type compatibility and common-day compatibility inside the existing cart add operation, so every current add-to-cart entry point gets the same protection.
- Extend the existing Lab Detail catalogue controls and cards rather than creating a new screen or route.
- Extend the existing Test Detail view to display exact Partner-provided requirements and per-test report type without invented medical guidance.
- Extend the existing Lab Selection date buttons to apply Specialized weekday restrictions while leaving time-slot behavior unchanged.
- Add a compact “Before Collection” summary in the existing cart/confirmation experience when selected tests contain Partner-provided instructions.

## Verification
- Add focused tests for General-only, General + General, Specialized-only, compatible Specialized combinations, incompatible Specialized combinations, mixed-type blocking, invalid Specialized metadata, weekday normalization, and legacy fallback.
- Verify search and category filtering work in both catalogue sections.
- Verify cart metadata survives reload and the existing single-lab conflict remains unchanged.
- Verify the existing Lab → Cart → Lab Selection → Payment flow still works.
- Run TypeScript checks, focused lint, the full test suite, production build, and preview error checks.

## Safety boundaries
- No changes to routes, authentication, payment, order creation, order tracking, reports, addresses, lab filtering, ECG/BP scheduling, or existing Edge Functions.
- No hardcoded test names or hardcoded Specialized weekdays.
- No second cart, lab selector, checkout, or payment flow.
