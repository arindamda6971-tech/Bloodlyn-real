-- Doctor consultations: ring a patient who opens the app late, let patients rate a
-- finished consultation, and keep the link and ring time server-only.

ALTER TABLE public.orders
  -- When the doctor last rang (set by update-call-status). The app rings on opening
  -- if this is recent, so a patient who had the app closed still gets the call.
  ADD COLUMN IF NOT EXISTS call_status_at timestamptz,
  -- The patient's rating of a finished doctor consultation.
  ADD COLUMN IF NOT EXISTS consult_rating smallint,
  ADD COLUMN IF NOT EXISTS consult_review text,
  ADD COLUMN IF NOT EXISTS consult_rated_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_consult_rating_range') THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_consult_rating_range CHECK (consult_rating IS NULL OR consult_rating BETWEEN 1 AND 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_consult_review_length') THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_consult_review_length CHECK (consult_review IS NULL OR char_length(consult_review) <= 500);
  END IF;
END $$;

-- A doctor's bookings for a day are looked up on every booking (duplicate check).
CREATE INDEX IF NOT EXISTS idx_orders_user_vendor_date
  ON public.orders (user_id, vendor_id, scheduled_date);

-- Same guard as before, plus: the Meet link and ring time are set only by the server,
-- and a patient can rate only their own finished doctor consultation.
CREATE OR REPLACE FUNCTION public.guard_order_booking_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- A cancelled order stays cancelled, so a lab working from an old screen
  -- can't revive a booking the patient cancelled.
  IF lower(COALESCE(OLD.status, '')) = 'cancelled' AND lower(COALESCE(NEW.status, '')) <> 'cancelled' THEN
    RAISE EXCEPTION 'This order was cancelled and cannot be changed' USING ERRCODE = '22023', DETAIL = 'order_cancelled';
  END IF;

  IF current_user IN ('authenticated', 'anon') AND (
       NEW.status IS DISTINCT FROM OLD.status
    OR NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date
    OR NEW.scheduled_time_slot IS DISTINCT FROM OLD.scheduled_time_slot
    OR NEW.address_id IS DISTINCT FROM OLD.address_id
    OR NEW.family_member_id IS DISTINCT FROM OLD.family_member_id
    OR NEW.lab_name IS DISTINCT FROM OLD.lab_name
    OR NEW.test_name IS DISTINCT FROM OLD.test_name
    OR NEW.cancellation_reason IS DISTINCT FROM OLD.cancellation_reason
    OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
    OR NEW.reschedule_count IS DISTINCT FROM OLD.reschedule_count
    OR NEW.rescheduled_at IS DISTINCT FROM OLD.rescheduled_at
    OR NEW.meet_link IS DISTINCT FROM OLD.meet_link
    OR NEW.call_status_at IS DISTINCT FROM OLD.call_status_at
  ) THEN
    RAISE EXCEPTION 'Booking changes go through the app''s cancel and reschedule options' USING ERRCODE = '42501';
  END IF;

  IF current_user IN ('authenticated', 'anon') AND (
       NEW.consult_rating IS DISTINCT FROM OLD.consult_rating
    OR NEW.consult_review IS DISTINCT FROM OLD.consult_review
    OR NEW.consult_rated_at IS DISTINCT FROM OLD.consult_rated_at
  ) AND NOT (
       lower(COALESCE(OLD.status, '')) IN ('completed', 'report_ready', 'report_delivered')
    AND COALESCE(OLD.test_name, '') ~* '^(Video Call|Audio Call|Physical Appointment|Clinic Visit) with '
  ) THEN
    RAISE EXCEPTION 'Only a finished doctor consultation can be rated' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- Each doctor's average rating and number of ratings, for the doctor list. Doctor
-- bookings carry the doctor's partner account id in vendor_id.
CREATE OR REPLACE FUNCTION public.doctor_consult_ratings()
RETURNS TABLE (doctor_id uuid, rating numeric, reviews integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.vendor_id, round(avg(o.consult_rating)::numeric, 1), count(*)::integer
  FROM public.orders o
  WHERE o.consult_rating IS NOT NULL AND o.vendor_id IS NOT NULL
  GROUP BY o.vendor_id
$$;

REVOKE ALL ON FUNCTION public.doctor_consult_ratings() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.doctor_consult_ratings() TO service_role;
