# Handover — patient app

The full handover for all three BloodLyn projects lives in the **`partner-pro`**
repository, at `HANDOVER.md`. Read that one first; it has the project map, how deploys
work, the user's standing rules, and every open job. This file only lists what is
specific to this repository.

## Unfinished here

**Error reporting catches crashes but not failures.** `src/lib/reportError.ts` is
built and verified — uncaught errors, unhandled promise rejections and error-boundary
crashes reach the `client_errors` table in this project's Supabase. But 168 `catch`
blocks in this app handle their own errors silently, so a booking that fails and shows
a toast is invisible.

Two changes, described in full in `partner-pro/HANDOVER.md`:

1. `src/App.tsx`, around line 432, already has `queryCache: new QueryCache({ onError })`
   and `mutationCache: new MutationCache({ onError })`, both only calling
   `console.error`. Change them to call `reportError`. That covers every read and write
   going through React Query.
2. The checkout handler calls `create-order` through `supabase.functions.invoke`
   directly, so the hooks above never see it. Report from its `catch`.

Also: return early from `reportError` when `navigator.onLine === false`, so a patient
with no signal doesn't fill the table.

Read what has been collected so far:

```sql
SELECT message, count(*) AS times, max(created_at) AS last_seen
FROM client_errors WHERE created_at > now() - interval '7 days'
GROUP BY message ORDER BY times DESC;
```

## Also open, specific to this app

- **Test patients, test orders and fake prescriptions** are still in the live database
  and must go before launch. `partner-pro/scripts/delete-lab/` has the SQL for both
  projects.
- **Prescription retention**: the clean-up job is held until launch; wipe the test
  uploads first.
- Production source maps are off, so stack traces stored here hold minified positions.
  Turning them on would not change what is stored — see the note in the main handover.
