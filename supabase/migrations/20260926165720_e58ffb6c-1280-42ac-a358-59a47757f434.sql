ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS availability_type text,
  ADD COLUMN IF NOT EXISTS available_days text[],
  ADD COLUMN IF NOT EXISTS sample_type text,
  ADD COLUMN IF NOT EXISTS preparation_required boolean,
  ADD COLUMN IF NOT EXISTS preparation_instruction text,
  ADD COLUMN IF NOT EXISTS fasting_required boolean,
  ADD COLUMN IF NOT EXISTS fasting_instruction text,
  ADD COLUMN IF NOT EXISTS report_type text;