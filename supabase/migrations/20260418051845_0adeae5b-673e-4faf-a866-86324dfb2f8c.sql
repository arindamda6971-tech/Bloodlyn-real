
-- ============================================================
-- 1. PHLEBOTOMISTS TABLE LOCKDOWN
-- ============================================================
-- Revoke direct table access for anon/authenticated; force usage of phlebotomists_public view.
REVOKE SELECT ON public.phlebotomists FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.phlebotomists FROM anon, authenticated;

-- Ensure RLS is enabled (no policies = no client access by default)
ALTER TABLE public.phlebotomists ENABLE ROW LEVEL SECURITY;

-- Make sure the safe view is readable
GRANT SELECT ON public.phlebotomists_public TO anon, authenticated;

-- ============================================================
-- 2. notify_partner_hub_on_order — read secrets from vault
-- ============================================================
-- NOTE: The user must add two secrets to vault.secrets named:
--   'supabase_url'       -> https://dmfqfswgnfpqeseqswhl.supabase.co
--   'service_role_key'   -> (the project's service-role JWT)
-- via the Supabase dashboard (Project Settings -> Vault).
CREATE OR REPLACE FUNCTION public.notify_partner_hub_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  payload jsonb;
  request_id bigint;
  v_url text;
  v_key text;
BEGIN
  -- Hardcoded fallback URL (project-specific, safe to expose).
  v_url := 'https://dmfqfswgnfpqeseqswhl.supabase.co';

  -- Read service-role key from Supabase Vault.
  BEGIN
    SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_key := NULL;
  END;

  -- If key missing, skip silently — order still succeeds.
  IF v_key IS NULL THEN
    RAISE NOTICE 'notify_partner_hub_on_order: service_role_key not in vault, skipping webhook';
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
  );

  SELECT net.http_post(
    url := v_url || '/functions/v1/partner-hub-webhook',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := payload
  ) INTO request_id;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. subscription_purchase_attempts (idempotency)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscription_purchase_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_purchase_attempts ENABLE ROW LEVEL SECURITY;

-- Owners can view their own attempts (debugging). Edge function uses service role to insert.
CREATE POLICY "Users can view their own purchase attempts"
  ON public.subscription_purchase_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS subscription_purchase_attempts_user_idx
  ON public.subscription_purchase_attempts(user_id, created_at DESC);

-- ============================================================
-- 4. Addresses: enforce single default per user
-- ============================================================
-- First, normalize existing data so the unique index can be created safely:
-- Keep only the most-recently-updated default per user.
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC, created_at DESC) AS rn
  FROM public.addresses
  WHERE is_default = true
)
UPDATE public.addresses a
SET is_default = false
FROM ranked r
WHERE a.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS addresses_one_default_per_user
  ON public.addresses(user_id) WHERE is_default = true;

CREATE OR REPLACE FUNCTION public.enforce_single_default_address()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.addresses
       SET is_default = false
     WHERE user_id = NEW.user_id
       AND id <> NEW.id
       AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_addresses_single_default ON public.addresses;
CREATE TRIGGER trg_addresses_single_default
  BEFORE INSERT OR UPDATE OF is_default ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_default_address();

-- ============================================================
-- 5. Serviceable pincodes index
-- ============================================================
CREATE INDEX IF NOT EXISTS serviceable_pincodes_pincode_active_idx
  ON public.serviceable_pincodes(pincode) WHERE is_active = true;

-- ============================================================
-- 6. Orphan cart-items cleanup (no FK because labs sync from partner project)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_orphan_cart_items()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed integer;
BEGIN
  WITH del AS (
    DELETE FROM public.cart_items ci
    WHERE ci.lab_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.diagnostic_centers dc WHERE dc.id = ci.lab_id
      )
    RETURNING ci.id
  )
  SELECT count(*) INTO removed FROM del;
  RETURN removed;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_orphan_cart_items() FROM PUBLIC, anon, authenticated;
