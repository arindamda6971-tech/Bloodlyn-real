# Explore performance and Home refresh fix

## Goal
Remove the lag when opening Explore Tests and returning Home, while preserving every existing animation, transition, booking flow, and Edge Function.

## Changes
- Stop mounting thousands of test rows at once; render only a bounded visible window and extend it as the user scrolls.
- Keep the complete Admin catalogue cached for search and details, but prevent large catalogue responses from being repeatedly serialized to local storage during navigation.
- Reuse the existing Admin-backed search rather than filtering or duplicating the full catalogue in multiple screen queries.
- Prevent inactive Explore content from competing with the Home transition frame during the existing exit animation.
- Enable the same existing pull-to-refresh interaction on Home that other main screens already use.
- Correct the current Explore test type mismatch without changing displayed data or business rules.

## Validation
- Check Explore loading, scrolling, search, test detail navigation, and return-to-Home behavior.
- Check pull-to-refresh on Home and another screen.
- Run TypeScript checks, focused tests, lint, and the production build.
- Confirm no Edge Function, migration, pricing, cart, booking, payment, or authentication code changed.

## Technical notes
- Frontend-only changes in catalogue query/cache configuration and Explore/Home presentation.
- Existing CSS/Framer Motion transition classes and animation timings remain untouched.
