-- Phase 1 follow-up: Supabase Postgres best practices fixes
-- Addresses audit findings from security-rls-performance, schema-foreign-key-indexes,
-- security-privileges, query-missing-indexes, and schema-data-types rules.

-- ============================================================================
-- 1. Remove redundant indexes (UNIQUE constraints already create indexes)
-- ============================================================================

DROP INDEX IF EXISTS idx_profiles_username;
DROP INDEX IF EXISTS idx_collections_slug;

-- ============================================================================
-- 2. Add missing foreign key indexes for CASCADE deletes
-- ============================================================================

CREATE INDEX idx_pinned_collections_collection_id
  ON public.pinned_collections(collection_id);

CREATE INDEX idx_recent_images_image_id
  ON public.recent_images(image_id);

-- ============================================================================
-- 3. Fix file size columns: INTEGER -> BIGINT for future-proofing
-- ============================================================================

ALTER TABLE public.images
  ALTER COLUMN original_size_bytes TYPE BIGINT,
  ALTER COLUMN compressed_size_bytes TYPE BIGINT;

-- ============================================================================
-- 4. RLS helper functions (SECURITY DEFINER with search_path hardened)
--    Avoids per-row EXISTS subquery joins in image policies.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_view_collection(p_collection_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.collections
    WHERE id = p_collection_id
    AND (is_public = true OR user_id = (SELECT auth.uid()))
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_collection(p_collection_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.collections
    WHERE id = p_collection_id
    AND user_id = (SELECT auth.uid())
  );
$$;

-- ============================================================================
-- 5. Harden existing SECURITY DEFINER functions with search_path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_daily_upload_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET
    daily_upload_count = CASE
      WHEN last_upload_date = CURRENT_DATE THEN daily_upload_count + 1
      ELSE 1
    END,
    last_upload_date = CURRENT_DATE
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.increment_daily_collection_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET
    daily_collection_count = CASE
      WHEN last_collection_date = CURRENT_DATE THEN daily_collection_count + 1
      ELSE 1
    END,
    last_collection_date = CURRENT_DATE
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email_verified, account_created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)),
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================================
-- 6. Replace all RLS policies with (select auth.uid()) optimization
--    This caches the auth.uid() call per query instead of per row.
-- ============================================================================

-- Profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ((select auth.uid()) = id);

-- Collections
DROP POLICY IF EXISTS "Public collections are viewable by everyone" ON public.collections;
CREATE POLICY "Public collections are viewable by everyone"
  ON public.collections FOR SELECT
  USING (is_public = true OR user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own collections" ON public.collections;
CREATE POLICY "Users can insert own collections"
  ON public.collections FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own collections" ON public.collections;
CREATE POLICY "Users can update own collections"
  ON public.collections FOR UPDATE
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own collections" ON public.collections;
CREATE POLICY "Users can delete own collections"
  ON public.collections FOR DELETE
  USING ((select auth.uid()) = user_id);

-- Images: replace EXISTS subqueries with helper functions
DROP POLICY IF EXISTS "Images in public collections are viewable by everyone" ON public.images;
CREATE POLICY "Images in public collections are viewable by everyone"
  ON public.images FOR SELECT
  USING (public.can_view_collection(collection_id));

DROP POLICY IF EXISTS "Users can insert images to own collections" ON public.images;
CREATE POLICY "Users can insert images to own collections"
  ON public.images FOR INSERT
  WITH CHECK (public.owns_collection(collection_id));

DROP POLICY IF EXISTS "Users can update own images" ON public.images;
CREATE POLICY "Users can update own images"
  ON public.images FOR UPDATE
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own images" ON public.images;
CREATE POLICY "Users can delete own images"
  ON public.images FOR DELETE
  USING ((select auth.uid()) = user_id);

-- Pinned collections
DROP POLICY IF EXISTS "Users can view own pinned collections" ON public.pinned_collections;
CREATE POLICY "Users can view own pinned collections"
  ON public.pinned_collections FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own pinned collections" ON public.pinned_collections;
CREATE POLICY "Users can insert own pinned collections"
  ON public.pinned_collections FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own pinned collections" ON public.pinned_collections;
CREATE POLICY "Users can delete own pinned collections"
  ON public.pinned_collections FOR DELETE
  USING ((select auth.uid()) = user_id);

-- Collection followers
DROP POLICY IF EXISTS "Users can view own followed collections" ON public.collection_followers;
CREATE POLICY "Users can view own followed collections"
  ON public.collection_followers FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can follow collections" ON public.collection_followers;
CREATE POLICY "Users can follow collections"
  ON public.collection_followers FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can unfollow collections" ON public.collection_followers;
CREATE POLICY "Users can unfollow collections"
  ON public.collection_followers FOR DELETE
  USING ((select auth.uid()) = user_id);

-- Recent images
DROP POLICY IF EXISTS "Users can view own recent images" ON public.recent_images;
CREATE POLICY "Users can view own recent images"
  ON public.recent_images FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own recent images" ON public.recent_images;
CREATE POLICY "Users can insert own recent images"
  ON public.recent_images FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own recent images" ON public.recent_images;
CREATE POLICY "Users can update own recent images"
  ON public.recent_images FOR UPDATE
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- 7. Add stored generated tsvector column for full-text search
-- ============================================================================

ALTER TABLE public.images
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, ''))) STORED;

CREATE INDEX idx_images_search_vector ON public.images USING GIN (search_vector);

-- Drop the old expression-based index (the new stored column index replaces it)
DROP INDEX IF EXISTS idx_images_title_search;
