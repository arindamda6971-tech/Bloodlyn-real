-- When a lab says a test's report is ready ("24" hours or "3 days"), copied from
-- the Partner portal so patients can see it. The bucket limit backs up the app,
-- which shrinks photos to around 500 KB and refuses larger PDFs.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS report_time text;

UPDATE storage.buckets
  SET file_size_limit = 10485760
  WHERE id = 'order-prescriptions';
