
-- 1. Fix diagnostic_centers: restrict SELECT to authenticated only
DROP POLICY IF EXISTS "Anyone can view diagnostic centers" ON public.diagnostic_centers;

CREATE POLICY "Authenticated users can view diagnostic centers"
ON public.diagnostic_centers
FOR SELECT
TO authenticated
USING (true);

-- 2. Fix orders: prevent payment_status/financial field manipulation
CREATE OR REPLACE FUNCTION public.prevent_financial_field_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service role (via edge functions) to update anything
  -- Block regular users from changing financial fields
  IF current_setting('role', true) != 'service_role' THEN
    NEW.payment_status := OLD.payment_status;
    NEW.total := OLD.total;
    NEW.subtotal := OLD.subtotal;
    NEW.discount := OLD.discount;
    NEW.payment_method := OLD.payment_method;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_order_financial_fields
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.prevent_financial_field_updates();

-- 3. Fix prescriptions bucket: remove broad public listing policy
DROP POLICY IF EXISTS "Public can read prescriptions" ON storage.objects;
