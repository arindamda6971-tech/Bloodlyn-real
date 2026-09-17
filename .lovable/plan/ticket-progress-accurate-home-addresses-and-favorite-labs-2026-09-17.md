# Ticket progress, accurate home addresses, and favorite labs

## What will change

1. **Support ticket progress**
   - Show a full-screen, readable “Creating your request… Please hold on” state immediately after submission.
   - Block duplicate taps while the request is being created.
   - Keep the existing success page and error handling unchanged.

2. **Home address accuracy**
   - Refresh saved addresses whenever Home becomes active again, including after adding or editing an address.
   - Display the saved address type (Home, Office, or Other) as the heading and the complete address as the subtitle.
   - Make address switching atomic from the user’s perspective: validate both updates, update the service PIN only after success, and restore the list on failure.
   - Keep temporary service-PIN behavior and all booking/address rules unchanged.

3. **Favorite partner labs**
   - Add a heart control at the top-right of each Partner Lab banner, without triggering banner navigation.
   - Save favorites per signed-in user in Supabase with private row-level access.
   - Make the Profile “Saved” count real and open a Saved Labs page showing favorited labs with remove and open-lab actions.
   - Keep lab serviceability, pricing, schedules, booking, and all edge functions unchanged.

## Technical details

- Add a `favorite_labs` table containing `user_id` and `lab_id`, with a unique user/lab pair, explicit authenticated/service-role grants, and policies limiting users to their own favorites.
- Add a small shared favorite-labs query/mutation hook so Home, Profile, and Saved Labs stay synchronized through the existing query cache.
- Add the Saved Labs route and preload it consistently with existing protected screens.
- Use existing semantic styling and current BloodLyn layouts; the uploaded images are visual references only.

## Verification

- Test ticket creation loading, success, failure, and duplicate-tap prevention.
- Test add/edit/select address, leave Home, return Home, and confirm correct labels/details.
- Test favorite/unfavorite from Home, Saved count, Saved Labs list, and persistence after refresh.
- Run focused tests, TypeScript checks, production build, and desktop/mobile browser checks.
