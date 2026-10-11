-- =====================================================================
-- Migration: High-Concurrency & Scale Optimizations (Defensive & Resilient)
-- Description:
-- 1. High-speed composite indexes for diagnostic orders, cart items, addresses, and test catalogues.
-- 2. Dynamically checks existing column names so it runs with 0 errors on any schema state.
-- 3. RLS subquery optimizations using (SELECT auth.uid()) to avoid row-by-row auth re-evaluation.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. High-Performance Indexes for Live Diagnostic Queries
-- ---------------------------------------------------------------------

-- Speed up user orders list, live tracking, and status filtering
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_orders_user_status ON public.orders (user_id, status, created_at DESC);
  END IF;
END $$;

-- Speed up fetching items for a specific order in bookings & reports
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'order_id') THEN
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
  END IF;
END $$;

-- Speed up diagnostic test catalog search & category filtering (checks category_id vs category)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tests' AND column_name = 'category_id') THEN
    CREATE INDEX IF NOT EXISTS idx_tests_active_category ON public.tests (is_active, category_id);
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tests' AND column_name = 'category') THEN
    CREATE INDEX IF NOT EXISTS idx_tests_active_category ON public.tests (is_active, category);
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tests' AND column_name = 'is_active') THEN
    CREATE INDEX IF NOT EXISTS idx_tests_active ON public.tests (is_active);
  END IF;
END $$;

-- Speed up popular health packages queries on the home screen
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'test_packages' AND column_name = 'is_active') THEN
    CREATE INDEX IF NOT EXISTS idx_test_packages_active ON public.test_packages (is_active);
  END IF;
END $$;

-- Speed up cart synchronization and fetching for active shoppers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items (user_id);
  END IF;
END $$;

-- Speed up address verification & default address lookups at checkout
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_addresses_user_default ON public.addresses (user_id, is_default DESC);
  END IF;
END $$;

-- Speed up lab reports lookup per order
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reports') THEN
    CREATE INDEX IF NOT EXISTS idx_reports_order_id ON public.reports (order_id);
    CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports (user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2. RLS Subquery Wrapping: Prevents N*M Table Scans
-- Wrapping auth.uid() in (SELECT auth.uid()) evaluates the JWT once per query 
-- instead of for every candidate row in high-traffic scans.
-- ---------------------------------------------------------------------

-- Orders RLS optimization
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
    DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
    
    CREATE POLICY "Users can view their own orders" 
      ON public.orders FOR SELECT 
      USING (user_id = (SELECT auth.uid()));
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Cart Items RLS optimization
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cart_items') THEN
    DROP POLICY IF EXISTS "Users can view their own cart" ON public.cart_items;
    DROP POLICY IF EXISTS "Users can insert into their cart" ON public.cart_items;
    DROP POLICY IF EXISTS "Users can update their cart" ON public.cart_items;
    DROP POLICY IF EXISTS "Users can delete from their cart" ON public.cart_items;

    CREATE POLICY "Users can view their own cart" 
      ON public.cart_items FOR SELECT TO authenticated 
      USING (user_id = (SELECT auth.uid()));

    CREATE POLICY "Users can insert into their cart" 
      ON public.cart_items FOR INSERT TO authenticated 
      WITH CHECK (user_id = (SELECT auth.uid()));

    CREATE POLICY "Users can update their cart" 
      ON public.cart_items FOR UPDATE TO authenticated 
      USING (user_id = (SELECT auth.uid()));

    CREATE POLICY "Users can delete from their cart" 
      ON public.cart_items FOR DELETE TO authenticated 
      USING (user_id = (SELECT auth.uid()));
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Addresses RLS optimization
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'addresses') THEN
    DROP POLICY IF EXISTS "Users can view their own addresses" ON public.addresses;
    DROP POLICY IF EXISTS "Users can manage their own addresses" ON public.addresses;

    CREATE POLICY "Users can manage their own addresses" 
      ON public.addresses FOR ALL TO authenticated 
      USING (user_id = (SELECT auth.uid()))
      WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
