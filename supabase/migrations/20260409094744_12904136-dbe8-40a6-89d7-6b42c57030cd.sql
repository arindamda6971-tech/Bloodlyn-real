
DROP POLICY IF EXISTS "Anyone can view active diagnostic centers" ON public.diagnostic_centers;

CREATE POLICY "Anyone can view diagnostic centers"
ON public.diagnostic_centers
FOR SELECT
USING (true);
