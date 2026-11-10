-- The doctor rings the patient by setting orders.call_status (through the
-- update-call-status function), and the patient's app listens for it. The column
-- was only in an earlier migration file that never reached the database, so every
-- ring failed and the patient's phone never rang.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS call_status text;
