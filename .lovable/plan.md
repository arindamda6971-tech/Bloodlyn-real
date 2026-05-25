# BloodLyn — 11-point Fix & Polish Plan

A focused pass across UX bugs, redesigns, a new order-tracking status that bridges to the **BloodLyn Partner Real** project, and a security sweep. Nothing existing functional will be broken; edge functions stay intact unless explicitly extended.

---

## 1. Skip onboarding for returning users
- In `src/pages/SplashScreen.tsx`, after the loading animation, check auth + a `bloodlyn-onboarded` flag.
  - If `supabase.auth.getSession()` returns a user → go straight to `/home`.
  - Else if onboarding flag set → `/login`.
  - Else → `/onboarding` (and set the flag at the end of onboarding).
- Onboarding screen marks the flag on "Get Started" so future first-launches skip it.

## 2. Redesign Location Check screen (city-icon style)
- Rebuild `src/pages/LocationCheckScreen.tsx` with an ultra-modern layout: hero gradient, premium glass PIN input, a "Detect my location" pill, and a horizontal **"Available Cities"** rail.
- Each serviceable city renders as a tile with a **landmark SVG icon** (India Gate → Delhi, Howrah Bridge → Kolkata, Gateway of India → Mumbai, Vidhana Soudha → Bangalore, Charminar → Hyderabad, Marina → Chennai, etc.) — tapping a city auto-fills a representative PIN and runs the same serviceability check.
- All existing validation, Supabase calls and downstream nav stays identical.

## 3. Home labs flicker (showing out-of-area labs first)
- In the lab/diagnostic-center fetch on `HomeScreen` (`useRealtimeDiagnosticCenters` / `DiagnosticCentersCarousel`), pre-filter by the user's pincode **before first paint** instead of rendering all rows and then removing.
- Add a skeleton state until the pincode-aware query resolves so nothing renders, then filtered list appears.

## 4. Notifications: redesign + sound
- Make the bell icon on Home reliably open `/notifications` (already wired — verify and fix unread badge).
- Redesign `src/pages/NotificationsScreen.tsx` with an industry-grade layout: grouped by Today / Earlier, colored type chips, swipe-to-dismiss, empty-state illustration, sticky header with "Mark all read".
- Add a short notification chime: play `/notification.mp3` (added to `public/`) inside `NotificationContext` only when a **new order-type** notification arrives (respects mute + reduced-motion + first user-gesture rule).

## 5. Toasts at top, not bottom
- Update Sonner `<Toaster />` mount in `src/App.tsx` (or `main.tsx`) to `position="top-center"`, `offset={16}`, `richColors`, with safe-area padding so it never overlaps the status bar or header.

## 6. Address saved twice on first login
- In `LocationCheckScreen` / `LocationChip` save flow, replace the "update default false → insert" pattern with an **upsert keyed on `(user_id, pincode)`** and skip insert when an address already exists. Also guard the save handler with an `isSavingRef` to prevent double-fire from React StrictMode/double-tap.

## 7. Payment → Place Order glitch (bounces back once)
- In `PaymentScreen` / `place-order` handler, disable the CTA immediately on tap (`isPlacing` state), wrap the navigation in `await` of the edge function response, and use `navigate(..., { replace: true })` so the back-stack doesn't snap to Payment again. Remove the duplicate effect that re-triggers on `paymentMethod` change.

## 8. Offline banner
- New `src/components/OfflineBanner.tsx` listens to `navigator.onLine` + `online`/`offline` events and shows a top sticky banner: "No internet connection. Please try again." with smooth slide-in/out.
- Mounted once in `App.tsx` so it works on every route, including Capacitor builds (`@capacitor/network` optional enhancement, but the web API is enough).

## 9. Booking time on My Orders tiles
- In `src/pages/BookingsScreen.tsx`, render `format(new Date(order.created_at), "dd MMM, hh:mm a")` under the order number as "Booked on …". No schema change.

## 10. New "Order Accepted" tracking step + Partner action
- **Tracking UI:** insert a new step **"Order Accepted"** between *Booking Confirmed* and *Collection Partner Assigned* in `src/pages/TrackingScreen.tsx`. Map it to `status = 'accepted'`.
- **Status flow:** `pending → confirmed → accepted → assigned → collected → processing → report_ready`. All other transitions untouched.
- **Partner project hand-off:** the partner app (`BloodLyn Partner Real`, project `cb96a44d-aed4-4137-8b99-3842db03c50b`) needs an **"Accept Order"** button in its orders table that updates `orders.status` to `'accepted'`. Because both projects share the same Supabase DB, no edge function changes are required on our side — the existing realtime listener will pick the new status up.
- **Prompt for the Partner project** (copy/paste into that project's chat):
  > *"In the Orders data table, add an **Accept Order** button visible only when `status = 'confirmed'`. On click, update that row to `status = 'accepted'`, `accepted_at = now()` via the existing partner edge function (or a new `accept-order` function if needed). Keep all other status transitions unchanged. Show a toast on success and refresh the row."*

## 11. Security sweep
- Run `supabase--linter` + `security--run_security_scan`, fix anything actionable in migrations (RLS gaps, function `search_path`, exposed columns), and update `mem://security/security-scan-acknowledgments` for intentional findings. No edge function touched.

---

## Technical notes
- **Files added:** `src/components/OfflineBanner.tsx`, `src/components/location/CityRail.tsx` (+ inline SVG landmarks), `public/notification.mp3`.
- **Files edited:** `SplashScreen.tsx`, `OnboardingScreen.tsx`, `LocationCheckScreen.tsx`, `LocationChip.tsx`, `HomeScreen.tsx`, `useRealtimeDiagnosticCenters.ts`, `NotificationsScreen.tsx`, `NotificationContext.tsx`, `App.tsx`, `PaymentScreen.tsx`, `BookingsScreen.tsx`, `TrackingScreen.tsx`, `index.css`.
- **No edge functions modified.** Partner-side change is described as a prompt only.
- **DB:** no schema changes needed; `'accepted'` is a free-form `status` text value already permitted by existing RLS update policy.

Approve and I'll ship it in one pass.