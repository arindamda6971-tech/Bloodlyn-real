-- Force prescriptions bucket to private (fix public flag)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'prescriptions';