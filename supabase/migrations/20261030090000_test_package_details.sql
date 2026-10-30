-- Package details set by labs in the Partner portal (synced by its
-- blood-lyn-sync function): category for the filter chips, who the package is
-- for, preparation, report time, and the names of the tests inside.
ALTER TABLE public.test_packages
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS age_group text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS fasting_hours smallint,
  ADD COLUMN IF NOT EXISTS report_hours smallint,
  ADD COLUMN IF NOT EXISTS sample_type text,
  ADD COLUMN IF NOT EXISTS included_tests jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS test_packages_active_category_idx
  ON public.test_packages (category) WHERE is_active;
