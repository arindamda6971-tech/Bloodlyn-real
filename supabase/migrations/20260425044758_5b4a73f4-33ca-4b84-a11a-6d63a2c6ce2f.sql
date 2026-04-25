
DROP POLICY IF EXISTS "Users can reschedule their pending orders" ON public.orders;
CREATE POLICY "Users can reschedule their pending orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status IN ('pending','confirmed'))
  WITH CHECK (auth.uid() = user_id AND status IN ('pending','confirmed'));
