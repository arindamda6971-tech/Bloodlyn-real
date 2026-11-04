-- Patients can cancel or reschedule a booking until the lab assigns a collection
-- partner. Both go through server functions; the app can no longer change booking
-- fields on its own, and a cancelled order stays cancelled.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS reschedule_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rescheduled_at timestamptz;

-- The one rule for "can the patient still change this booking?"
CREATE OR REPLACE FUNCTION public.customer_can_change_order(o public.orders)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(COALESCE(o.status, '')) IN ('pending', 'confirmed', 'accepted', 'collection_pending')
    AND NOT COALESCE(o.is_escalated, false)
    AND NULLIF(btrim(COALESCE(o.delivery_partner_name, '')), '') IS NULL
    AND NULLIF(btrim(COALESCE(o.delivery_partner_phone, '')), '') IS NULL
    AND o.phlebotomist_id IS NULL
$$;

CREATE OR REPLACE FUNCTION public.cancel_order_by_customer(
  _order_id uuid,
  _user_id uuid,
  _reason text
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
  v_reason text := left(btrim(COALESCE(_reason, '')), 200);
BEGIN
  IF current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'cancel_order_by_customer is server-only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id AND user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;
  IF lower(COALESCE(v_order.status, '')) = 'cancelled' THEN
    RETURN v_order;
  END IF;
  IF NOT public.customer_can_change_order(v_order) THEN
    RAISE EXCEPTION 'A collection partner is already assigned. Please contact support to change this booking.'
      USING ERRCODE = '22023', DETAIL = 'partner_assigned';
  END IF;

  UPDATE public.orders
  SET status = 'cancelled',
      cancellation_reason = 'Cancelled by patient' || CASE WHEN v_reason <> '' THEN ': ' || v_reason ELSE '' END,
      cancelled_at = now()
  WHERE id = _order_id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_order_by_customer(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_order_by_customer(uuid, uuid, text) TO service_role;

-- Same capacity check as before; now also refuses once a collection partner is
-- assigned, and records that the booking was moved.
CREATE OR REPLACE FUNCTION public.reschedule_order_with_slot_capacity(
  _order_id uuid,
  _user_id uuid,
  _scheduled_date date,
  _scheduled_time_slot text,
  _slot_capacity integer
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
  v_vendor_id uuid;
  v_normalized_slot text;
  v_booked integer;
BEGIN
  IF current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'reschedule_order_with_slot_capacity is server-only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id AND user_id = _user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;
  IF lower(COALESCE(v_order.status, '')) = 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled orders cannot be rescheduled' USING ERRCODE = '22023';
  END IF;
  IF NOT public.customer_can_change_order(v_order) THEN
    RAISE EXCEPTION 'A collection partner is already assigned. Please contact support to change this booking.'
      USING ERRCODE = '22023', DETAIL = 'partner_assigned';
  END IF;

  v_vendor_id := v_order.vendor_id;
  v_normalized_slot := CASE
    WHEN lower(_scheduled_time_slot) ~ '6\s*(am|:00\s*am)\s*-\s*8\s*(am|:00\s*am)' THEN '06:00-08:00'
    WHEN lower(_scheduled_time_slot) ~ '8\s*(am|:00\s*am)\s*-\s*10\s*(am|:00\s*am)' THEN '08:00-10:00'
    WHEN lower(_scheduled_time_slot) ~ '10\s*(am|:00\s*am)\s*-\s*12\s*(pm|:00\s*pm)' THEN '10:00-12:00'
    WHEN lower(_scheduled_time_slot) ~ '12\s*(pm|:00\s*pm)\s*-\s*2\s*(pm|:00\s*pm)' THEN '12:00-14:00'
    WHEN lower(_scheduled_time_slot) ~ '2\s*(pm|:00\s*pm)\s*-\s*4\s*(pm|:00\s*pm)' THEN '14:00-16:00'
    WHEN lower(_scheduled_time_slot) ~ '4\s*(pm|:00\s*pm)\s*-\s*6\s*(pm|:00\s*pm)' THEN '16:00-18:00'
    ELSE NULL
  END;

  IF v_vendor_id IS NULL OR v_normalized_slot IS NULL OR _slot_capacity IS NULL OR _slot_capacity < 0 THEN
    RAISE EXCEPTION 'Slot capacity is unavailable' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_vendor_id::text || '|' || _scheduled_date::text || '|' || v_normalized_slot, 0));

  SELECT count(*)::integer INTO v_booked
  FROM public.orders o
  WHERE o.vendor_id = v_vendor_id
    AND o.scheduled_date = _scheduled_date
    AND o.id <> _order_id
    AND lower(COALESCE(o.status, '')) <> 'cancelled'
    AND CASE
      WHEN lower(COALESCE(o.scheduled_time_slot, '')) ~ '6\s*(am|:00\s*am)\s*-\s*8\s*(am|:00\s*am)' THEN '06:00-08:00'
      WHEN lower(COALESCE(o.scheduled_time_slot, '')) ~ '8\s*(am|:00\s*am)\s*-\s*10\s*(am|:00\s*am)' THEN '08:00-10:00'
      WHEN lower(COALESCE(o.scheduled_time_slot, '')) ~ '10\s*(am|:00\s*am)\s*-\s*12\s*(pm|:00\s*pm)' THEN '10:00-12:00'
      WHEN lower(COALESCE(o.scheduled_time_slot, '')) ~ '12\s*(pm|:00\s*pm)\s*-\s*2\s*(pm|:00\s*pm)' THEN '12:00-14:00'
      WHEN lower(COALESCE(o.scheduled_time_slot, '')) ~ '2\s*(pm|:00\s*pm)\s*-\s*4\s*(pm|:00\s*pm)' THEN '14:00-16:00'
      WHEN lower(COALESCE(o.scheduled_time_slot, '')) ~ '4\s*(pm|:00\s*pm)\s*-\s*6\s*(pm|:00\s*pm)' THEN '16:00-18:00'
      ELSE NULL
    END = v_normalized_slot;

  IF v_booked >= _slot_capacity THEN
    RAISE EXCEPTION 'Collection slot is fully booked' USING ERRCODE = 'P0001', DETAIL = 'slot_capacity_reached';
  END IF;

  UPDATE public.orders
  SET scheduled_date = _scheduled_date,
      scheduled_time_slot = _scheduled_time_slot,
      reschedule_count = reschedule_count + 1,
      rescheduled_at = now()
  WHERE id = _order_id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.reschedule_order_with_slot_capacity(uuid, uuid, date, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_order_with_slot_capacity(uuid, uuid, date, text, integer) TO service_role;

-- Runs as the caller (not SECURITY DEFINER) so current_user tells app users apart
-- from the server: signed-in patients can still set things like call status, but
-- booking fields change only through the server functions above.
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
  ) THEN
    RAISE EXCEPTION 'Booking changes go through the app''s cancel and reschedule options' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_order_booking_fields ON public.orders;
CREATE TRIGGER trg_guard_order_booking_fields
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.guard_order_booking_fields();
