ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_escalated boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS escalation_comment text, ADD COLUMN IF NOT EXISTS escalated_at timestamptz;
CREATE TABLE public.no_show_deliveries (order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE, vendor_id uuid NOT NULL, comment text NOT NULL, reported_at timestamptz NOT NULL DEFAULT now(), delivered_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.no_show_deliveries TO service_role;
ALTER TABLE public.no_show_deliveries ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.protect_no_show_fields() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN
IF current_setting('role', true) <> 'service_role' THEN
 IF TG_OP = 'INSERT' THEN NEW.is_escalated := false; NEW.escalation_comment := NULL; NEW.escalated_at := NULL;
 ELSE NEW.is_escalated := OLD.is_escalated; NEW.escalation_comment := OLD.escalation_comment; NEW.escalated_at := OLD.escalated_at; END IF;
END IF;
IF TG_OP = 'UPDATE' AND OLD.is_escalated THEN NEW.status := 'cancelled'; NEW.is_escalated := true; NEW.escalation_comment := OLD.escalation_comment; NEW.escalated_at := OLD.escalated_at; NEW.cancellation_reason := OLD.cancellation_reason; NEW.cancelled_at := OLD.cancelled_at; END IF;
RETURN NEW; END $$;
CREATE TRIGGER protect_no_show_fields BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.protect_no_show_fields();
REVOKE ALL ON FUNCTION public.protect_no_show_fields() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.escalate_no_show(_order_id uuid, _user_id uuid, _comment text) RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.orders; v_end integer; v_match text[]; v_hour integer; v_minute integer; v_now timestamp := timezone('Asia/Kolkata', now());
BEGIN
IF current_setting('role', true) <> 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
IF _comment IS NULL OR length(btrim(_comment)) < 3 OR length(_comment) > 1000 THEN RAISE EXCEPTION 'Comment must contain 3 to 1000 characters' USING ERRCODE='22023'; END IF;
SELECT * INTO v_order FROM public.orders WHERE id=_order_id AND user_id=_user_id FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Order not found' USING ERRCODE='P0002'; END IF;
IF v_order.is_escalated THEN RETURN v_order; END IF;
IF lower(coalesce(v_order.status,'')) NOT IN ('assigned','partner_assigned','phlebotomist_assigned','processing','collection_pending') OR v_order.vendor_id IS NULL OR (nullif(btrim(v_order.delivery_partner_name),'') IS NULL AND nullif(btrim(v_order.delivery_partner_phone),'') IS NULL) THEN RAISE EXCEPTION 'This order cannot be reported as a missed collection' USING ERRCODE='22023'; END IF;
IF v_order.scheduled_date IS NOT NULL THEN
 v_match := regexp_match(lower(coalesce(v_order.scheduled_time_slot,'')), '-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)');
 IF v_match IS NOT NULL THEN
 v_hour := v_match[1]::integer; v_minute := coalesce(v_match[2],'0')::integer;
 IF v_hour NOT BETWEEN 1 AND 12 OR v_minute NOT BETWEEN 0 AND 59 THEN RAISE EXCEPTION 'Invalid collection window' USING ERRCODE='22023'; END IF;
 v_end := (v_hour % 12 + CASE WHEN v_match[3]='pm' THEN 12 ELSE 0 END)*60 + v_minute;
 ELSE
 v_end := CASE WHEN lower(v_order.scheduled_time_slot) LIKE '%morning%' THEN 600 WHEN lower(v_order.scheduled_time_slot) LIKE '%afternoon%' THEN 840 WHEN lower(v_order.scheduled_time_slot) LIKE '%evening%' THEN 1080 ELSE NULL END;
 END IF;
 IF v_order.scheduled_date > v_now::date OR (v_order.scheduled_date = v_now::date AND (v_end IS NULL OR extract(hour FROM v_now)*60+extract(minute FROM v_now)<v_end)) THEN RAISE EXCEPTION 'You can report a missed collection only after your booked slot ends' USING ERRCODE='22023'; END IF;
END IF;
UPDATE public.orders SET status='cancelled', is_escalated=true, escalation_comment=btrim(_comment), cancellation_reason=btrim(_comment), cancelled_at=now(), escalated_at=now(), updated_at=now() WHERE id=v_order.id RETURNING * INTO v_order;
INSERT INTO public.no_show_deliveries(order_id,vendor_id,comment,reported_at) VALUES(v_order.id,v_order.vendor_id,v_order.escalation_comment,v_order.escalated_at) ON CONFLICT(order_id) DO NOTHING;
RETURN v_order;
END $$;
REVOKE ALL ON FUNCTION public.escalate_no_show(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.escalate_no_show(uuid,uuid,text) TO service_role;