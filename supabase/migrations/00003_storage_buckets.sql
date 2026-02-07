-- Phase 3: Storage buckets and RLS policies for image uploads

-- ============================================================================
-- 1. Create the images storage bucket
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,            -- Public read (URLs contain unguessable UUIDs; images table RLS controls discovery)
  2097152,         -- 2MB per file (client compresses before upload)
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- ============================================================================
-- 2. Storage RLS policies
-- ============================================================================

-- Users can upload files only to their own folder
CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'images' AND
    (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Users can delete files only from their own folder
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'images' AND
    (storage.foldername(name))[1] = (select auth.uid())::text
  );
