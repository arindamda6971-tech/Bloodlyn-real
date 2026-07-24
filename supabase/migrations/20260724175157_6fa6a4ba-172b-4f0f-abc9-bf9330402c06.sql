
ALTER TABLE public.diagnostic_centers
  ADD COLUMN IF NOT EXISTS offers_home_bp boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS home_bp_price numeric NOT NULL DEFAULT 299,
  ADD COLUMN IF NOT EXISTS offers_home_ecg boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS diagnostic_centers_offers_home_bp_idx
  ON public.diagnostic_centers (offers_home_bp) WHERE offers_home_bp = true;
