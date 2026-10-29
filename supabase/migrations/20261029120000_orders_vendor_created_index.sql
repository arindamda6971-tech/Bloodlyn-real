-- The Partner portal's order sync reads each lab's orders by vendor_id, newest
-- first (fetch-orders / fetch-orders-v2). Without this index every sync scans
-- the whole orders table, which gets slow as orders grow.
CREATE INDEX IF NOT EXISTS idx_orders_vendor_created
  ON public.orders (vendor_id, created_at DESC);
