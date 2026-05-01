-- 1) Restrict anon access on diagnostic_centers to non-sensitive columns via a public view
DROP POLICY IF EXISTS "Public can view active centers" ON public.diagnostic_centers;

CREATE OR REPLACE VIEW public.diagnostic_centers_public
WITH (security_invoker = true) AS
SELECT
  id, name, address, city, state, pincode, latitude, longitude,
  logo_url, rating, reviews_count, is_active, opening_time, closing_time,
  service_pincodes, available_tests, pricing, services,
  ecg_available, ecg_price, home_collection_available, is_verified,
  created_at, updated_at
FROM public.diagnostic_centers
WHERE is_active = true;

GRANT SELECT ON public.diagnostic_centers_public TO anon, authenticated;

-- 2) Lock down profiles: block client-side wallet_balance writes
CREATE OR REPLACE FUNCTION public.prevent_profile_sensitive_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('role', true) <> 'service_role' THEN
    NEW.wallet_balance := OLD.wallet_balance;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_sensitive_updates ON public.profiles;
CREATE TRIGGER trg_prevent_profile_sensitive_updates
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_sensitive_updates();

-- 3) Lock down wallet_transactions: only service_role may insert
DROP POLICY IF EXISTS "Users insert their wallet transactions" ON public.wallet_transactions;

CREATE OR REPLACE FUNCTION public.prevent_client_wallet_inserts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'wallet_transactions can only be created via server-side logic';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_client_wallet_inserts ON public.wallet_transactions;
CREATE TRIGGER trg_prevent_client_wallet_inserts
BEFORE INSERT ON public.wallet_transactions
FOR EACH ROW EXECUTE FUNCTION public.prevent_client_wallet_inserts();

-- 4) Tighten orders update guard: lock vendor_id, coupon_code, report_url too
CREATE OR REPLACE FUNCTION public.prevent_financial_field_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('role', true) <> 'service_role' THEN
    NEW.payment_status := OLD.payment_status;
    NEW.total := OLD.total;
    NEW.subtotal := OLD.subtotal;
    NEW.discount := OLD.discount;
    NEW.payment_method := OLD.payment_method;
    NEW.coupon_code := OLD.coupon_code;
    NEW.vendor_id := OLD.vendor_id;
    NEW.report_url := OLD.report_url;
    NEW.delivery_partner_name := OLD.delivery_partner_name;
    NEW.delivery_partner_phone := OLD.delivery_partner_phone;
    NEW.phlebotomist_id := OLD.phlebotomist_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_financial_field_updates ON public.orders;
CREATE TRIGGER trg_prevent_financial_field_updates
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_field_updates();