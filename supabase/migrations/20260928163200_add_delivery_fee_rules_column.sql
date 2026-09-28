-- Add delivery_fee_rules JSONB column to diagnostic_centers
-- Stores MRP-based delivery fee rules synced from the partner portal
-- Format: [{ "min_mrp": 0, "max_mrp": 500, "fee": 50 }, ...]
ALTER TABLE public.diagnostic_centers
  ADD COLUMN IF NOT EXISTS delivery_fee_rules JSONB DEFAULT NULL;

COMMENT ON COLUMN public.diagnostic_centers.delivery_fee_rules
  IS 'JSONB array of MRP-based delivery fee rules synced from partner portal mrp_delivery_rules table';
