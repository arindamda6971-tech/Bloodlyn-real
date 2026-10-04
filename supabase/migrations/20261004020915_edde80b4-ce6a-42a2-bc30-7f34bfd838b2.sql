CREATE OR REPLACE FUNCTION public.create_order_with_slot_capacity(
  _order jsonb,
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
  v_scheduled_date date;
  v_raw_slot text;
  v_normalized_slot text;
  v_booked integer;
BEGIN
  IF current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'create_order_with_slot_capacity is server-only' USING ERRCODE = '42501';
  END IF;

  v_vendor_id := NULLIF(_order->>'vendor_id', '')::uuid;
  v_scheduled_date := NULLIF(_order->>'scheduled_date', '')::date;
  v_raw_slot := COALESCE(_order->>'scheduled_time_slot', '');

  v_normalized_slot := CASE
    WHEN lower(v_raw_slot) ~ '6\s*(am|:00\s*am)\s*-\s*8\s*(am|:00\s*am)' THEN '06:00-08:00'
    WHEN lower(v_raw_slot) ~ '8\s*(am|:00\s*am)\s*-\s*10\s*(am|:00\s*am)' THEN '08:00-10:00'
    WHEN lower(v_raw_slot) ~ '10\s*(am|:00\s*am)\s*-\s*12\s*(pm|:00\s*pm)' THEN '10:00-12:00'
    WHEN lower(v_raw_slot) ~ '12\s*(pm|:00\s*pm)\s*-\s*2\s*(pm|:00\s*pm)' THEN '12:00-14:00'
    WHEN lower(v_raw_slot) ~ '2\s*(pm|:00\s*pm)\s*-\s*4\s*(pm|:00\s*pm)' THEN '14:00-16:00'
    WHEN lower(v_raw_slot) ~ '4\s*(pm|:00\s*pm)\s*-\s*6\s*(pm|:00\s*pm)' THEN '16:00-18:00'
    ELSE NULL
  END;

  IF v_vendor_id IS NOT NULL AND v_scheduled_date IS NOT NULL AND v_raw_slot <> '' THEN
    IF v_normalized_slot IS NULL THEN
      RAISE EXCEPTION 'Unsupported collection slot' USING ERRCODE = '22023';
    END IF;
    IF _slot_capacity IS NULL OR _slot_capacity < 0 THEN
      RAISE EXCEPTION 'Slot capacity is unavailable' USING ERRCODE = '22023';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(v_vendor_id::text || '|' || v_scheduled_date::text || '|' || v_normalized_slot, 0));

    SELECT count(*)::integer INTO v_booked
    FROM public.orders o
    WHERE o.vendor_id = v_vendor_id
      AND o.scheduled_date = v_scheduled_date
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
  END IF;

  INSERT INTO public.orders (
    user_id, address_id, scheduled_date, scheduled_time_slot, subtotal, discount,
    total, payment_method, status, payment_status, coupon_code,
    special_instructions, vendor_id, lab_name, test_name, client_idempotency_key
  ) VALUES (
    (_order->>'user_id')::uuid,
    NULLIF(_order->>'address_id', '')::uuid,
    v_scheduled_date,
    NULLIF(_order->>'scheduled_time_slot', ''),
    COALESCE((_order->>'subtotal')::numeric, 0),
    COALESCE((_order->>'discount')::numeric, 0),
    COALESCE((_order->>'total')::numeric, 0),
    NULLIF(_order->>'payment_method', ''),
    COALESCE(NULLIF(_order->>'status', ''), 'confirmed'),
    COALESCE(NULLIF(_order->>'payment_status', ''), 'completed'),
    NULLIF(_order->>'coupon_code', ''),
    NULLIF(_order->>'special_instructions', ''),
    v_vendor_id,
    NULLIF(_order->>'lab_name', ''),
    NULLIF(_order->>'test_name', ''),
    NULLIF(_order->>'client_idempotency_key', '')
  )
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_with_slot_capacity(jsonb, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_with_slot_capacity(jsonb, integer) TO service_role;

CREATE INDEX IF NOT EXISTS idx_orders_slot_capacity_lookup
ON public.orders (vendor_id, scheduled_date, scheduled_time_slot)
WHERE status IS DISTINCT FROM 'cancelled';