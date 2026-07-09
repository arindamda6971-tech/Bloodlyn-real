ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS call_status text DEFAULT NULL;
