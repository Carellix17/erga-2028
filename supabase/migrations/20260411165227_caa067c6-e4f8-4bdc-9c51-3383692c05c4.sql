
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-images', 'study-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for study images"
ON storage.objects FOR SELECT
USING (bucket_id = 'study-images');

CREATE POLICY "Service role upload for study images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'study-images');
