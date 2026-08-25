CREATE POLICY "Users can upload their own order prescriptions"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'order-prescriptions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read their own order prescriptions"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'order-prescriptions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own order prescriptions"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'order-prescriptions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own order prescriptions"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'order-prescriptions' AND (storage.foldername(name))[1] = auth.uid()::text);