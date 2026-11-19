-- When each step of an order happened, for the patient's Progress timeline
-- ("Order accepted · 20 Nov, 9:14 AM", "Sample collected · 10:42 AM", "Report ready · …").
--
-- orders only kept created_at / updated_at, so the times are stamped here, by the
-- database, the moment the status (or the assigned partner) changes, whichever path
-- changed it: the lab portal, the partner's collection code, the patient. The trigger
-- works them out from the old row on every write, so a value sent by an app is ignored
-- and a time, once set, never moves.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS partner_assigned_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS sample_collected_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS report_ready_at timestamptz;

CREATE OR REPLACE FUNCTION public.stamp_order_step_times()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  s text := lower(coalesce(NEW.status, ''));
  accepted boolean := s IN ('accepted', 'collection_pending', 'assigned', 'partner_assigned', 'out_for_collection', 'processing',
                            'sample_collected', 'in_progress', 'collection_complete', 'sample_received', 'lab_processing',
                            'report_ready', 'report_delivered', 'completed', 'checked');
  collected boolean := s IN ('sample_collected', 'in_progress', 'collection_complete', 'sample_received', 'lab_processing',
                             'report_ready', 'report_delivered', 'completed', 'checked');
  reported boolean := s IN ('report_ready', 'report_delivered', 'completed', 'checked');
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Never from the app: carry the stored times over, then add the step just reached.
    NEW.accepted_at := OLD.accepted_at;
    NEW.partner_assigned_at := OLD.partner_assigned_at;
    NEW.sample_collected_at := OLD.sample_collected_at;
    NEW.report_ready_at := OLD.report_ready_at;
  ELSE
    NEW.accepted_at := NULL;
    NEW.partner_assigned_at := NULL;
    NEW.sample_collected_at := NULL;
    NEW.report_ready_at := NULL;
  END IF;

  IF accepted AND NEW.accepted_at IS NULL THEN NEW.accepted_at := now(); END IF;
  IF coalesce(btrim(NEW.delivery_partner_name), '') <> '' AND NEW.partner_assigned_at IS NULL THEN NEW.partner_assigned_at := now(); END IF;
  IF collected AND NEW.sample_collected_at IS NULL THEN NEW.sample_collected_at := now(); END IF;
  IF reported AND NEW.report_ready_at IS NULL THEN NEW.report_ready_at := now(); END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_step_times ON public.orders;
CREATE TRIGGER orders_step_times
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.stamp_order_step_times();

-- Orders from before this: the exact collection time where the partner's code was used;
-- otherwise only the step an order is at now gets a time, from its last change. Earlier
-- steps of old orders stay without a time.
ALTER TABLE public.orders DISABLE TRIGGER orders_step_times;

UPDATE public.orders o
SET sample_collected_at = c.used_at
FROM public.collection_codes c
WHERE c.order_id = o.id AND c.used_at IS NOT NULL AND o.sample_collected_at IS NULL;

UPDATE public.orders
SET report_ready_at = updated_at
WHERE report_ready_at IS NULL
  AND lower(coalesce(status, '')) IN ('report_ready', 'report_delivered', 'completed', 'checked');

UPDATE public.orders
SET sample_collected_at = updated_at
WHERE sample_collected_at IS NULL
  AND lower(coalesce(status, '')) IN ('sample_collected', 'in_progress', 'collection_complete', 'sample_received', 'lab_processing');

UPDATE public.orders
SET accepted_at = updated_at
WHERE accepted_at IS NULL
  AND lower(coalesce(status, '')) IN ('accepted', 'collection_pending', 'assigned', 'partner_assigned', 'out_for_collection', 'processing');

ALTER TABLE public.orders ENABLE TRIGGER orders_step_times;
