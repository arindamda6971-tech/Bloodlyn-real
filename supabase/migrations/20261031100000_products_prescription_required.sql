-- Set by labs in the Partner portal: the patient must attach a prescription to
-- book this test. The cart asks for it and create-order refuses without it.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS prescription_required boolean NOT NULL DEFAULT false;
