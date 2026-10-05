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
      scheduled_time_slot = _scheduled_time_slot
  WHERE id = _order_id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.reschedule_order_with_slot_capacity(uuid, uuid, date, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_order_with_slot_capacity(uuid, uuid, date, text, integer) TO service_role;