## Scope — 7 parts

### 1. Location screen — remove landmark labels
In `LocationCheckScreen.tsx`: keep `Icon`, `name`, `state`, `pincode`, `gradient`; remove the `landmark` text rendered under each city tile. Icons + city names stay.

### 2. Sticky/squeezing search bar (industry-style)
Build a reusable `<StickySearch>` component that:
- Lives inside a scroll container.
- On scroll-down: the content above it compresses (header shrinks, greeting fades), and the search bar sticks to the top with a slight elevation/blur.
- On scroll-up: header re-expands.
- Implemented with `useScroll` + `useTransform` from framer-motion (already in the project) for 60fps GPU transforms.

Apply to: `HomeScreen`, `CategoriesScreen`, `CategoryTestsScreen`, `LabDetailScreen`, `PackagesScreen`, `TestSelectionScreen`, `ReportsScreen`, `BookingsScreen`, `SupportScreen` — wherever a top search exists.

Also fixes the "search bar hiding / elements overlapping" bug by giving it a real sticky container with `z-index` and `backdrop-blur` instead of floating absolutely.

### 3. Redesign Lab Vendor Profile (`LabDetailScreen.tsx`)
Modern redesign matching the screenshot baseline but elevated:
- Hero with parallax gradient, lab logo in glass tile, NABL chip, rating, tests count, location/timing chips, "Home Collection" pill — refined typography & spacing.
- Sticky tab bar (All Tests / Health Packages) that docks under the squeezing search.
- Test list as **expandable cards**: tapping the test name expands inline to reveal description, parameters, prep instructions, sample type — with smooth height animation. "+ Add" stays on the right.
- Empty / loading skeleton states.
- Full dark-mode token coverage.

### 4. Over-scroll fix
Add to `index.css`:
```css
html, body, #root { overscroll-behavior-y: contain; }
.scroll-area { overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
```
Audit `TestSelectionScreen`, `BookingsScreen`, `ReportsScreen`, `CategoryTestsScreen` and replace nested scrollables that cause double-scroll with a single scroll container + `overscroll-behavior: contain`.

### 5. Multi-test display = "FirstName + N other"
Create helper `formatTestsLabel(tests)`:
- 1 test → `"Lipid Profile"`
- 2 tests → `"Lipid Profile + 1 other"`
- 3+ → `"Lipid Profile + 2 others"`

Apply in:
- `BookingsScreen` order tiles (replaces "3 tests").
- Home recent-orders carousel tiles.
- TrackingScreen header.
- Cart summary chips.

**Reorder button** must add the **actual order_items** (by test_id) back into the cart context, not a placeholder. Update the reorder handler to map `order.order_items` → `addToCart` with real names and prices.

### 6. Duplicate guards
- **Family member**: add `savingRef` + uniqueness check on `(user_id, name, relation, age)` in `AddFamilyMemberDialog` before insert.
- **Address (LocationChip)**: port the same `savingRef` + `savedKeyRef` + upsert-style pattern from `LocationCheckScreen` into `LocationChip.tsx`'s save handler.

### 7. Redesign for industry standard
- **ProfileScreen**: hero card (avatar + name + health score chip), grouped settings list with iconography, subtle dividers, dark-mode parity.
- **FamilyMembersScreen**: avatar-driven member cards with relation chip, age, quick edit/delete, empty state illustration.
- **SavedAddressesScreen**: address cards with type icon (Home/Work/Other), default badge, set-default + delete actions, map pin gradient.
- **BookingsScreen (My Orders)**: unified list, status pills with semantic colors, "Booked on…" timestamp, the new test-name label, search filter, dark-mode parity.

### 8. Dark-mode sweep
- Audit hard-coded `bg-white`, `text-black`, `text-gray-*`, `bg-gray-50` etc. across the screens above and especially **HomeScreen** (recent orders tiles in screenshot show washed-out cards in dark mode).
- Replace with semantic tokens: `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-muted/50`.
- Verify `.dark` variants in `index.css` cover surface, card, muted, accent.

### 9. Leftovers from previous loop
- Apply the dedup guard to `LocationChip` (covered in #6).
- Run `supabase--linter` + `security--run_security_scan`; fix any `search_path` mutable warnings on functions, missing RLS, or exposed columns. **No edge-function code touched.**

---

## Files to edit
- `src/pages/LocationCheckScreen.tsx` (drop landmark text)
- `src/components/home/LocationChip.tsx` (dedup guard)
- `src/components/ui/StickySearch.tsx` *(new)*
- `src/lib/format-tests.ts` *(new)*
- `src/pages/HomeScreen.tsx`, `CategoriesScreen.tsx`, `CategoryTestsScreen.tsx`, `LabDetailScreen.tsx`, `PackagesScreen.tsx`, `TestSelectionScreen.tsx`, `ReportsScreen.tsx`, `BookingsScreen.tsx`, `SupportScreen.tsx`
- `src/pages/ProfileScreen.tsx`, `FamilyMembersScreen.tsx`, `SavedAddressesScreen.tsx`, `TrackingScreen.tsx`
- `src/components/AddFamilyMemberDialog.tsx`
- `src/index.css` (overscroll + dark-mode token tweaks)
- Migration: any `search_path` fixes flagged by linter.

## What won't change
- Edge functions (`create-order`, `partner-hub-webhook`, `purchase-subscription`, `delete-account`, `analyze-prescription`, `bridge-proxy`) — untouched.
- Order/payment/tracking business logic.
- Cart single-lab restriction.

This is a large multi-screen change. I'll execute it in the order above and verify each section.
