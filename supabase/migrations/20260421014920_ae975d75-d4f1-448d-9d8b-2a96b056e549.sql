ALTER TABLE public.diagnostic_centers
  ADD COLUMN IF NOT EXISTS service_pincodes TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS diagnostic_centers_service_pincodes_idx
  ON public.diagnostic_centers USING GIN (service_pincodes);

UPDATE public.diagnostic_centers
SET service_pincodes = ARRAY[pincode]
WHERE pincode IS NOT NULL AND pincode <> ''
  AND (service_pincodes IS NULL OR array_length(service_pincodes, 1) IS NULL);