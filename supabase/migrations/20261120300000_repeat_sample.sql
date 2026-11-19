-- Repeat sample: the lab needs blood again (clotted, haemolysed, not enough…). The same
-- order goes back to "needs a collection partner" at a new day and time, free for the
-- patient (Partner update-order-status, repeat_sample). The patient's app shows why.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS repeat_sample_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS repeat_sample_reason text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS repeat_requested_at timestamptz;

-- Step times (20261120200000_order_step_times): an order that steps back for a repeat
-- loses its later times, so the new collection gets its own.
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

  -- Back before collection (a repeat sample): the later steps start again.
  IF accepted AND NOT collected THEN NEW.sample_collected_at := NULL; END IF;
  IF accepted AND NOT reported THEN NEW.report_ready_at := NULL; END IF;
  IF coalesce(btrim(NEW.delivery_partner_name), '') = '' THEN NEW.partner_assigned_at := NULL; END IF;

  IF accepted AND NEW.accepted_at IS NULL THEN NEW.accepted_at := now(); END IF;
  IF coalesce(btrim(NEW.delivery_partner_name), '') <> '' AND NEW.partner_assigned_at IS NULL THEN NEW.partner_assigned_at := now(); END IF;
  IF collected AND NEW.sample_collected_at IS NULL THEN NEW.sample_collected_at := now(); END IF;
  IF reported AND NEW.report_ready_at IS NULL THEN NEW.report_ready_at := now(); END IF;
  RETURN NEW;
END;
$$;
