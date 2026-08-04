-- Create storage bucket for forum images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'forum-images',
  'forum-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policy: Allow authenticated users to upload images
DROP POLICY IF EXISTS "Authenticated users can upload forum images" ON storage.objects;

CREATE POLICY "Authenticated users can upload forum images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'forum-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow authenticated users to update their own images
DROP POLICY IF EXISTS "Users can update their own forum images" ON storage.objects;

CREATE POLICY "Users can update their own forum images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'forum-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Allow authenticated users to delete their own images
DROP POLICY IF EXISTS "Users can delete their own forum images" ON storage.objects;

CREATE POLICY "Users can delete their own forum images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'forum-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Allow public read access to forum images
DROP POLICY IF EXISTS "Public read access to forum images" ON storage.objects;

CREATE POLICY "Public read access to forum images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'forum-images');
