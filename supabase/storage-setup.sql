/* 
  RUN THIS IN YOUR SUPABASE SQL EDITOR 
  URL: https://supabase.com/dashboard/project/_/editor
*/

-- 1. Create the 'attachments' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow everyone to VIEW images (since it's a public chat)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'attachments' );

-- 3. Allow AUTHENTICATED users to UPLOAD images
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'attachments' );

-- 4. Allow users to DELETE their own uploads (optional/safety)
CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text );
