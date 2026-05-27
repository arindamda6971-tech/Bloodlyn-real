
-- Lock down SECURITY DEFINER trigger/helper functions: they should only be invoked
-- by triggers or service_role, never directly callable from PostgREST by anon/authenticated.
-- has_role is referenced inside RLS policies, so signed-in users must keep EXECUTE on it.

DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.update_diagnostic_centers_updated_at()',
    'public.generate_order_number()',
    'public.generate_referral_code()',
    'public.enforce_single_default_address()',
    'public.cleanup_orphan_cart_items()',
    'public.notify_partner_hub_on_order()',
    'public.prevent_profile_sensitive_updates()',
    'public.prevent_client_wallet_inserts()',
    'public.prevent_financial_field_updates()',
    'public.handle_new_user()',
    'public.update_updated_at_column()'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;

-- has_role is invoked inside RLS predicates by authenticated users; restrict to that role only.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
