-- Home-collection links and in-app calls.
--
-- A lab shares an order with its collection partner on WhatsApp. The message carries
-- a link to a temporary page (bloodlyn web, /c/<token>) with the patient's name,
-- address, map and tests, and a "Call patient" button. The call rings inside the
-- patient's BloodLyn app over the internet (WebRTC), so neither side sees the other's
-- phone number. Phase one: no paid calling service; signalling runs on Supabase
-- Realtime and the collection-call function.

CREATE TABLE IF NOT EXISTS public.collection_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The secret in the link. Only the service role reads this table.
  token text NOT NULL UNIQUE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  partner_name text,
  -- What the page shows, as the lab saw it when sharing (patient name, address, slot, tests…).
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  -- Set when the lab shares the order with a different partner, so the old link stops working.
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS collection_links_order_idx ON public.collection_links (order_id);

ALTER TABLE public.collection_links ENABLE ROW LEVEL SECURITY;
-- No policies: links are created by the Partner Portal's collection-link function and
-- read by collection-call, both with the service role.

CREATE TABLE IF NOT EXISTS public.collection_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.collection_links(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  -- The patient whose app rings (orders.user_id).
  user_id uuid NOT NULL,
  -- A random name for the Realtime channel the two phones talk through.
  room text NOT NULL,
  caller_name text,
  lab_name text,
  status text NOT NULL DEFAULT 'ringing'
    CHECK (status IN ('ringing', 'accepted', 'declined', 'missed', 'ended', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  ended_at timestamptz
);

CREATE INDEX IF NOT EXISTS collection_calls_user_idx ON public.collection_calls (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS collection_calls_link_idx ON public.collection_calls (link_id, created_at DESC);

ALTER TABLE public.collection_calls ENABLE ROW LEVEL SECURITY;

-- The patient's app sees calls to them (to ring and to join the room). Everything
-- else (starting, answering, ending) goes through the collection-call function.
DROP POLICY IF EXISTS "Patients see calls to them" ON public.collection_calls;
CREATE POLICY "Patients see calls to them"
  ON public.collection_calls FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- The app listens for new calls in real time.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'collection_calls'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.collection_calls;
  END IF;
END $$;
