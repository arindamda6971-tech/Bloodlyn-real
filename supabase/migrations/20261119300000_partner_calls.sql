-- Patients call their collection partner from the BloodLyn app.
--
-- The same in-app call as the partner → patient one, the other way round: it rings in
-- the partner's BloodLyn Partner app (and as an alert on his phone), over the
-- internet, so neither side sees the other's number. The patient's app no longer
-- dials the partner's phone number.

ALTER TABLE public.collection_calls
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'to_patient';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'collection_calls_direction_check') THEN
    ALTER TABLE public.collection_calls
      ADD CONSTRAINT collection_calls_direction_check CHECK (direction IN ('to_patient', 'to_partner'));
  END IF;
END $$;

COMMENT ON COLUMN public.collection_calls.direction IS
  'to_patient: the partner called the patient''s app. to_partner: the patient called the partner''s app (user_id is still the patient).';

CREATE INDEX IF NOT EXISTS collection_calls_order_idx ON public.collection_calls (order_id, created_at DESC);
