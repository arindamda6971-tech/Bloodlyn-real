-- What the lab earns on an order, kept apart from BloodLyn's own platform fee.
-- The partner portal shows labs lab_amount only; the platform fee never reaches it.
-- Older orders keep NULL here, and the portal falls back to tests minus discount.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS collection_fee numeric(10,2),
  ADD COLUMN IF NOT EXISTS platform_fee numeric(10,2),
  ADD COLUMN IF NOT EXISTS lab_amount numeric(10,2);

COMMENT ON COLUMN public.orders.collection_fee IS 'The lab''s own home collection fee (from its fee rules) included in total.';
COMMENT ON COLUMN public.orders.platform_fee IS 'BloodLyn''s flat platform fee included in total. Never sent to labs.';
COMMENT ON COLUMN public.orders.lab_amount IS 'What the lab earns before commission: tests minus the lab''s own offer discount, plus its collection fee.';
