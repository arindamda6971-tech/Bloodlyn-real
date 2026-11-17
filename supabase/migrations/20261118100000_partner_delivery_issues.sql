-- Bookings that didn't reach the lab's Partner Portal.
--
-- create-order hands every lab booking to partner-hub-webhook, which forwards it
-- to the Partner project. When that forward fails (a wrong PARTNER_WEBHOOK_SECRET
-- gives 401, or the Partner project is down), nobody used to know: the lab only
-- saw the order later, when its portal pulled it. partner-hub-webhook now writes
-- a row here for every failed hand-off and marks it delivered once a later
-- attempt works. Admin lists the open ones and can send them again through the
-- ops-delivery-issues function.
--
-- Only the service role reads or writes this table.

CREATE TABLE IF NOT EXISTS public.partner_delivery_issues (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  order_number text,
  vendor_id text,
  lab_name text,
  status text NOT NULL DEFAULT 'failed' CHECK (status IN ('failed', 'delivered')),
  last_status_code integer,
  last_error text,
  attempts integer NOT NULL DEFAULT 1,
  -- The tests exactly as they were first sent, so a resend matches the original.
  line_items jsonb,
  first_failed_at timestamptz NOT NULL DEFAULT now(),
  last_tried_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_delivery_issues_open_idx
  ON public.partner_delivery_issues (first_failed_at DESC)
  WHERE status = 'failed';

ALTER TABLE public.partner_delivery_issues ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_delivery_issues FROM anon, authenticated;
