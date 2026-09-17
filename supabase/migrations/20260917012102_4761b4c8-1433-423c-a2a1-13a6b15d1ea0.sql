CREATE TABLE public.favorite_labs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lab_id uuid NOT NULL REFERENCES public.diagnostic_centers(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, lab_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorite_labs TO authenticated;
GRANT ALL ON public.favorite_labs TO service_role;

ALTER TABLE public.favorite_labs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorite labs"
ON public.favorite_labs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can save their own favorite labs"
ON public.favorite_labs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorite labs"
ON public.favorite_labs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorite labs"
ON public.favorite_labs
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX favorite_labs_user_created_idx
ON public.favorite_labs (user_id, created_at DESC);

CREATE INDEX favorite_labs_lab_idx
ON public.favorite_labs (lab_id);