# Extreme Smoothness Plan (Phase 2)

Goal: push perceived performance from "good" to "indistinguishable from native". No edge function, migration, RLS, or booking-logic changes — only rendering, scheduling, and asset behaviour.

## Step 1 — Measure before touching anything
- Instrument a dev-only frame-time probe (long-task + dropped-frame counter) on the heaviest screens: Home, Categories, Category Tests, Lab Selection, Cart, Reports, Bookings.
- Record a baseline: interaction-to-paint on tab switches, scroll FPS, and main-thread long tasks over 50ms.
- Output a short before/after table so every later step is provable, not assumed.

## Step 2 — Kill main-thread blocking on route change
- Audit every screen's top-level render for synchronous work (sorting, filtering, date math, `JSON.parse`, dictionary lookups) and move it behind `useMemo` keyed on inputs, or into the existing worker.
- Split heavy screens into an instant shell + deferred body so the first frame after navigation only paints the header and skeleton.
- Defer non-critical mounts (carousels, ad rails, banners) with `startTransition` / idle scheduling so they never compete with the transition frame.

## Step 3 — Provider and context surgery
- The app root wraps everything in Theme/Auth/Cart/Address/Notification providers; any state change there re-renders the whole tree. Split each context into a stable "actions" value and a narrow "state" value, and memoise.
- Move listener components (incoming call, doctor availability, appointment status) so their state updates cannot re-render routed screens.
- Verify with a render-count probe that a cart mutation re-renders only the cart badge and cart screen.

## Step 4 — Scrolling at a locked 60fps
- One scroll container per screen, `content-visibility: auto` with `contain-intrinsic-size` on every off-screen list section.
- Fixed-height skeletons everywhere so lists never reflow mid-scroll.
- Remove remaining backdrop blurs and multi-layer shadows from scrolling surfaces; keep glass only on fixed chrome.
- Passive scroll/touch listeners only; debounce the scroll-offset recorder used for restoration to `requestAnimationFrame`.

## Step 5 — Transition polish
- Shorten enter animations to 180–220ms with a native-feeling cubic-bezier, and make the outgoing page fade only (no transform) so only one layer animates.
- Promote exactly one layer per transition; drop `will-change` immediately on animation end (already partly done — extend to sheets, modals, bottom nav).
- Tab switches become an instant cross-fade with no vertical movement.
- Sheets/dialogs get transform-only enter/exit, no layout-affecting properties.

## Step 6 — Data timing so screens never show a spinner twice
- Per-data-class React Query policy: catalogue/labs long-lived, orders/slots short + realtime, profile medium.
- Prefetch on intent: warm the target route's query when a card is pressed down or scrolls into view.
- Keep the persisted cache hydration, but gate revalidation to after the transition frame so a cold navigation never fetches mid-animation.
- Optimistic updates for cart add/remove, family edits, and address selection.

## Step 7 — Assets and bundle
- Convert bundled illustrations/icons to WebP/AVIF with explicit dimensions and `decoding="async"`.
- Audit route chunks for accidental shared heavy imports (charts, PDF, animation libs) and lazy-load them at the component level.
- Preload only the first route chunk and the home hero; nothing else on boot.

## Step 8 — Native-shell tuning (Capacitor, config only)
- Confirm release config ships bundled assets, hardware acceleration and large heap stay on, keyboard `adjustResize` behaviour verified per screen.
- Status/navigation bar theming follows each screen; safe-area tokens verified on notch and non-notch devices.
- Android back handling re-verified on every sheet and nested flow.

## Step 9 — Verification gate
- Typecheck, lint, full test suite, production build after every step.
- Browser walkthrough of the critical flows (login, location gate, catalogue, cart, slot selection, checkout, tracking, reports) after each step.
- Final before/after frame-time and bundle report.

## Guardrails
- No edge function, migration, RLS, or booking/slot logic changes.
- No visual redesign — timing, layering, and scheduling only.
- Each step ships independently and ends verified; a risky step gets split, not forced.

## Suggested order
Steps 2, 3, and 5 give the biggest jump, then 4 and 6 for sustained smoothness, then 7 and 8, with Step 1 measurement first and Step 9 after each.
