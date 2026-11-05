-- Lab offers synced from the Partner portal (its profile sync is the only writer),
-- stored with the lab like delivery_fee_rules. create-order reads them to apply
-- an offer on the server, so the client never decides the discount.
-- Format: [{ "id", "type", "min_order_amount", "discount_value",
--            "max_discount_cap", "start_date", "end_date" }, ...]
ALTER TABLE public.diagnostic_centers
  ADD COLUMN IF NOT EXISTS offers JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.diagnostic_centers.offers
  IS 'Active lab offers synced from the Partner portal lab_offers table; see supabase/functions/_shared/lab-offers.ts';
