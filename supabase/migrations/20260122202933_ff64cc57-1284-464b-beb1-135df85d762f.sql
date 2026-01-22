-- Allow authenticated users to upload school images to avatars bucket
CREATE POLICY "Users can upload school images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'school-images'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow public read access to school images
CREATE POLICY "School images are publicly accessible"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'school-images'
);

-- Allow users to update their own school images
CREATE POLICY "Users can update their school images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'school-images'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow users to delete their own school images
CREATE POLICY "Users can delete their school images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'school-images'
  AND (storage.foldername(name))[2] = auth.uid()::text
);