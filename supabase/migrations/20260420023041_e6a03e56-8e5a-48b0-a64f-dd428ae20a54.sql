CREATE POLICY "Public can view active centers"
ON public.diagnostic_centers
FOR SELECT
TO anon
USING (true);