CREATE POLICY "Authenticated users can upload study images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'study-images' AND auth.uid()::text = (storage.foldername(name))[1]);