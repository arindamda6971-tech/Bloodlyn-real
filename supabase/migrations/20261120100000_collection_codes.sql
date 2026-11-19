-- The collection code (OTP): proof the collection partner really collected the sample.
--
-- The moment a lab assigns a collection partner to a booking, a 4-digit code is made
-- for it. Only the patient sees it (BloodLyn app). The partner enters it after
-- collecting (collection-call "confirm_collected"), which marks the booking collected,
-- instead of the patient tapping "Yes". A code used after the booked slot ends is
-- recorded as late (for penalising the lab later). Reassigning to another partner makes
-- a new code. The lab never sees the code: it isn't on the order the portal copies.

CREATE TABLE IF NOT EXISTS public.collection_codes (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  -- The patient (orders.user_id), the only one who may read it.
  user_id uuid NOT NULL,
  code text NOT NULL CHECK (code ~ '^[0-9]{4}$'),
  partner_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  used_late boolean,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz
);

ALTER TABLE public.collection_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients see their own collection code" ON public.collection_codes;
CREATE POLICY "Patients see their own collection code"
  ON public.collection_codes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 4 random digits (from gen_random_uuid's strong randomness).
CREATE OR REPLACE FUNCTION public.new_collection_code()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT lpad((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint % 10000)::text, 4, '0');
$$;

CREATE OR REPLACE FUNCTION public.make_collection_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL OR NEW.delivery_partner_name IS NULL OR btrim(NEW.delivery_partner_name) = '' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.delivery_partner_name IS NOT DISTINCT FROM NEW.delivery_partner_name THEN
    RETURN NEW;
  END IF;
  IF lower(coalesce(NEW.status, '')) IN ('sample_collected', 'processing', 'report_ready', 'report_uploaded', 'completed', 'cancelled') THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.collection_codes (order_id, user_id, code, partner_name)
  VALUES (NEW.id, NEW.user_id, public.new_collection_code(), NEW.delivery_partner_name)
  ON CONFLICT (order_id) DO UPDATE
    SET code = EXCLUDED.code,
        partner_name = EXCLUDED.partner_name,
        created_at = now(),
        failed_attempts = 0,
        locked_until = NULL
    WHERE public.collection_codes.used_at IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_collection_code ON public.orders;
CREATE TRIGGER orders_collection_code
  AFTER INSERT OR UPDATE OF delivery_partner_name ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.make_collection_code();

-- Bookings already assigned and not yet collected get their code now.
INSERT INTO public.collection_codes (order_id, user_id, code, partner_name)
SELECT o.id, o.user_id, public.new_collection_code(), o.delivery_partner_name
FROM public.orders o
WHERE o.user_id IS NOT NULL
  AND coalesce(btrim(o.delivery_partner_name), '') <> ''
  AND lower(coalesce(o.status, '')) NOT IN ('sample_collected', 'processing', 'report_ready', 'report_uploaded', 'completed', 'cancelled')
ON CONFLICT (order_id) DO NOTHING;
