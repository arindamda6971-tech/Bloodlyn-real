-- Errors that happen in patients' browsers, so a failure is noticed here rather than
-- only when someone complains. Nothing reads this table in the app; it is looked at
-- in the Supabase dashboard.
--
-- Kept deliberately small: the sender caps what it sends and stops after a handful
-- per visit, and a day's worth of errors is measured in kilobytes.

CREATE TABLE IF NOT EXISTS public.client_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  /** Which app it came from; here always "patient-app". */
  app text NOT NULL,
  /** Who hit it, when they were signed in. Null for a signed-out page. */
  user_id uuid,
  /** The page's path only — never the query string, which can carry a patient's details. */
  path text,
  message text NOT NULL,
  stack text,
  user_agent text,
  /** The build it happened on, so a fix can be matched to a release. */
  release text,
  CONSTRAINT client_errors_message_len CHECK (char_length(message) <= 500),
  CONSTRAINT client_errors_stack_len CHECK (stack IS NULL OR char_length(stack) <= 2000)
);

CREATE INDEX IF NOT EXISTS client_errors_recent_idx ON public.client_errors (created_at DESC);

ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

-- Anyone using the app may report one, including before they sign in: an error on the
-- login or booking page is exactly the kind nobody would otherwise hear about. Nobody
-- may read them back, so this can't become a way to look at other people's trouble.
DROP POLICY IF EXISTS "Anyone can report an error" ON public.client_errors;
CREATE POLICY "Anyone can report an error"
  ON public.client_errors FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Old errors are no use and shouldn't grow the database forever. Run this monthly, or
-- schedule it alongside the prescription clean-up job at launch:
--   DELETE FROM public.client_errors WHERE created_at < now() - interval '30 days';
