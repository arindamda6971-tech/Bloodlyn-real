-- A lab can call its patient from the lab dashboard, in-app, the same way a collection
-- partner does (collection-call, action "lab_start"). Neither side sees a phone number.
--
-- A lab's call has no collection-partner link, so link_id becomes optional, and the row
-- says who rang: caller_role 'partner' (every call so far) or 'lab', with the lab's
-- vendor id. direction stays 'to_patient', so the patient's app answers it like any
-- call to them.
--
-- Safe to run more than once. Nothing existing is changed: old rows get
-- caller_role 'partner', which they are.

ALTER TABLE public.collection_calls ALTER COLUMN link_id DROP NOT NULL;

ALTER TABLE public.collection_calls ADD COLUMN IF NOT EXISTS caller_role text NOT NULL DEFAULT 'partner';
ALTER TABLE public.collection_calls ADD COLUMN IF NOT EXISTS lab_vendor_id text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'collection_calls_caller_role_check') THEN
    ALTER TABLE public.collection_calls
      ADD CONSTRAINT collection_calls_caller_role_check CHECK (caller_role IN ('partner', 'lab'));
  END IF;
  -- A partner's call (either way) keeps its link; a lab's call names its lab.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'collection_calls_caller_check') THEN
    ALTER TABLE public.collection_calls
      ADD CONSTRAINT collection_calls_caller_check CHECK (
        (caller_role = 'partner' AND link_id IS NOT NULL)
        OR (caller_role = 'lab' AND lab_vendor_id IS NOT NULL AND direction = 'to_patient')
      );
  END IF;
END $$;

COMMENT ON COLUMN public.collection_calls.caller_role IS
  'Who rang the patient: partner (collection partner, through his link) or lab (the lab dashboard).';
COMMENT ON COLUMN public.collection_calls.lab_vendor_id IS
  'For a lab''s call: the lab (orders.vendor_id) that placed it.';
