-- Add client-supplied idempotency key to orders for ironclad duplicate prevention.
-- The application sends the same UUID for every retry of the same checkout session;
-- the partial UNIQUE index guarantees the database itself rejects a second insert.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS client_idempotency_key text;

-- Partial unique index: only enforce uniqueness when the key is present.
-- Existing historical rows (NULL) are unaffected; no auto-cleanup of past duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS orders_client_idempotency_key_uniq
  ON public.orders (user_id, client_idempotency_key)
  WHERE client_idempotency_key IS NOT NULL;