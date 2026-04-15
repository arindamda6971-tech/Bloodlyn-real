
-- Ensure the prescriptions bucket exists and is public (so getPublicUrl works)
UPDATE storage.buckets SET public = true WHERE id = 'prescriptions';

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload prescriptions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to read their own prescriptions
CREATE POLICY "Users can read own prescriptions"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own prescriptions
CREATE POLICY "Users can update own prescriptions"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own prescriptions
CREATE POLICY "Users can delete own prescriptions"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access for prescription images (so getPublicUrl works)
CREATE POLICY "Public can read prescriptions"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'prescriptions');
