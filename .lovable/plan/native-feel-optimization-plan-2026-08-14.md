# Native-Feel Optimization Plan

Goal: make BloodLyn (Capacitor WebView) feel indistinguishable from a native Android/iOS app — instant taps, no jank, no white flashes, native gestures and chrome. Executed step by step; each step is self-contained, ships independently, and touches no edge functions or booking logic.

## Step 1 — Startup & first paint
- Ship bundled assets (remove `server.url` hot-reload from the release config) so the app boots from disk, not the network.
- Splash hides only after the first real screen paints (already partly done) — extend to wait for auth + pincode gate resolution so users never see a flash of the wrong screen.
- Inline critical CSS for the shell (background, safe areas, spinner) so there is zero white frame.
- Preload the first route chunk and warm the home data cache during splash.

## Step 2 — Touch and input feel
- Global `touch-action`, `-webkit-tap-highlight-color: transparent`, and no 300ms delay on all tappable elements.
- Active-state press feedback (scale/opacity, 90–120ms) on cards, tiles, list rows, and nav items instead of hover styles.
- Haptics on primary actions: add to cart, slot select, booking confirm, tab switch (extend the existing nav haptics).
- Minimum 44x44 tap targets on icon-only buttons.
- Disable text selection and overscroll bounce on non-scrollable chrome; keep it inside scroll containers.

## Step 3 — Scrolling at 60fps
- Virtualize long lists (test catalogue, category tests, orders, reports, family members) so only visible rows render.
- Stable skeletons with fixed heights to remove layout shift while data loads.
- Momentum scrolling + `content-visibility: auto` on off-screen sections.
- Audit and cut remaining large blurs/shadows on scrolling surfaces; keep glass effects only on fixed chrome.

## Step 4 — Navigation transitions
- Consolidate on the existing CSS `translate3d` transitions; remove any leftover JS-driven animation on route change.
- Push/pop direction awareness: forward slides in from right, back slides out to right, tab switches cross-fade.
- Keep the swipe-back gesture, tune it to follow the finger 1:1 with a velocity-based commit threshold.
- Preserve scroll position on back navigation (restore per-route scroll offsets).

## Step 5 — Perceived speed / caching
- React Query defaults tuned per data class: catalogue and labs cached long, orders and slots short and realtime-backed.
- Persist selected queries to storage so a cold launch renders last-known data instantly, then revalidates.
- Prefetch on intent: warm the target route's data when a card enters the viewport or is pressed down.
- Optimistic UI for cart add/remove and family member edits.

## Step 6 — Images and assets
- Explicit width/height plus `aspect-ratio` on every image to stop reflow.
- Lazy load below-the-fold images, eager + high priority for the home hero.
- Serve WebP/AVIF where possible and cap icon/illustration payloads.
- Route-level code splitting review so no screen pulls in unrelated heavy libs.

## Step 7 — Native chrome and system integration
- Status bar and navigation bar theming that follows the current screen (light/dark, transparent overlay) with safe-area tokens already in place.
- Android hardware back handling verified on every modal, sheet, and nested flow (no accidental app exit).
- Keyboard behaviour: resize instead of overlay, auto-scroll the focused field into view, correct `inputmode`/`enterkeyhint` on all inputs.
- Pull-to-refresh on the main tabs using the existing hook.
- Offline state: cached shell + clear offline banner instead of failed screens.

## Step 8 — Verification pass
- Typecheck, lint, full test suite, production build after each step.
- Manual walkthrough of the critical flows (login, location gate, catalogue, cart, slot selection, checkout, tracking, reports) to confirm nothing regressed.
- Frame-rate spot checks on the heaviest screens, plus a report of before/after bundle size.

## Guardrails
- No edge function, migration, RLS policy, or booking/slot business logic changes.
- No visual redesign — only motion, timing, and rendering behaviour change.
- Each step ends verified; if a step risks a flow, it is split smaller rather than forced through.

## Suggested order
Steps 1, 2, and 4 give the biggest perceived-native jump, so we start there, then 3 and 5 for sustained smoothness, then 6, 7, and 8.
