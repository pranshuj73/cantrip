-- Phase 1: Core Database Schema
-- Tables, indexes, triggers, functions, and RLS policies

-- ============================================================================
-- 1. Shared trigger functions
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Profiles table
-- ============================================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,

  -- Storage quota tracking
  storage_used_bytes BIGINT DEFAULT 0,
  storage_quota_bytes BIGINT DEFAULT 104857600, -- 100MB default

  -- Rate limiting
  daily_upload_count INTEGER DEFAULT 0,
  last_upload_date DATE,
  daily_collection_count INTEGER DEFAULT 0,
  last_collection_date DATE,

  -- Account security
  email_verified BOOLEAN DEFAULT false,
  account_created_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON public.profiles(username);

CREATE TRIGGER trigger_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Reset daily counters when the date rolls over
CREATE OR REPLACE FUNCTION reset_daily_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_upload_date IS NOT NULL AND NEW.last_upload_date < CURRENT_DATE THEN
    NEW.daily_upload_count = 0;
  END IF;
  IF NEW.last_collection_date IS NOT NULL AND NEW.last_collection_date < CURRENT_DATE THEN
    NEW.daily_collection_count = 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reset_daily_counters
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION reset_daily_counters();

-- ============================================================================
-- 3. Collections table
-- ============================================================================

CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  slug TEXT UNIQUE NOT NULL,

  -- Denormalized counters
  image_count INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0,

  -- Security
  is_flagged BOOLEAN DEFAULT false,
  flag_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collections_user_id ON public.collections(user_id);
CREATE INDEX idx_collections_slug ON public.collections(slug);
CREATE INDEX idx_collections_is_public ON public.collections(is_public) WHERE is_public = true;
CREATE INDEX idx_collections_created_at ON public.collections(created_at DESC);
CREATE INDEX idx_collections_follower_count ON public.collections(follower_count DESC) WHERE is_public = true;
CREATE INDEX idx_collections_user_created ON public.collections(user_id, created_at DESC);

CREATE TRIGGER trigger_collections_updated_at
BEFORE UPDATE ON public.collections
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. Images table
-- ============================================================================

CREATE TABLE public.images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,

  -- File metadata
  original_size_bytes INTEGER NOT NULL,
  compressed_size_bytes INTEGER NOT NULL,
  file_hash TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  blurhash TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Security
  is_flagged BOOLEAN DEFAULT false,
  flag_count INTEGER DEFAULT 0
);

CREATE INDEX idx_images_collection_id ON public.images(collection_id);
CREATE INDEX idx_images_user_id ON public.images(user_id);
CREATE INDEX idx_images_file_hash ON public.images(file_hash);
CREATE INDEX idx_images_created_at ON public.images(created_at DESC);
CREATE INDEX idx_images_user_created ON public.images(user_id, created_at DESC);
CREATE INDEX idx_images_title_search ON public.images USING GIN (to_tsvector('english', title));
CREATE INDEX idx_images_public_feed ON public.images(created_at DESC) WHERE is_flagged = false;

CREATE TRIGGER trigger_images_updated_at
BEFORE UPDATE ON public.images
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update collection image_count on insert/delete
CREATE OR REPLACE FUNCTION update_collection_image_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.collections
    SET image_count = image_count + 1
    WHERE id = NEW.collection_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.collections
    SET image_count = image_count - 1
    WHERE id = OLD.collection_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_collection_image_count
AFTER INSERT OR DELETE ON public.images
FOR EACH ROW EXECUTE FUNCTION update_collection_image_count();

-- Update user storage_used_bytes on insert/delete
CREATE OR REPLACE FUNCTION update_storage_quota()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET storage_used_bytes = storage_used_bytes + NEW.compressed_size_bytes
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET storage_used_bytes = storage_used_bytes - OLD.compressed_size_bytes
    WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_storage_quota
AFTER INSERT OR DELETE ON public.images
FOR EACH ROW EXECUTE FUNCTION update_storage_quota();

-- ============================================================================
-- 5. Pinned collections table
-- ============================================================================

CREATE TABLE public.pinned_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, collection_id)
);

CREATE INDEX idx_pinned_collections_user_id ON public.pinned_collections(user_id, position);

-- ============================================================================
-- 6. Collection followers table
-- ============================================================================

CREATE TABLE public.collection_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, collection_id)
);

CREATE INDEX idx_collection_followers_user_id ON public.collection_followers(user_id);
CREATE INDEX idx_collection_followers_collection_id ON public.collection_followers(collection_id);

-- Update collection follower_count on insert/delete
CREATE OR REPLACE FUNCTION update_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.collections
    SET follower_count = follower_count + 1
    WHERE id = NEW.collection_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.collections
    SET follower_count = follower_count - 1
    WHERE id = OLD.collection_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_follower_count
AFTER INSERT OR DELETE ON public.collection_followers
FOR EACH ROW EXECUTE FUNCTION update_follower_count();

-- ============================================================================
-- 7. Recent images table
-- ============================================================================

CREATE TABLE public.recent_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, image_id)
);

CREATE INDEX idx_recent_images_user_used ON public.recent_images(user_id, last_used_at DESC);

-- ============================================================================
-- 8. Database functions (rate limit increments)
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_daily_upload_count(p_user_id UUID)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_daily_collection_count(p_user_id UUID)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. Row Level Security
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinned_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_images ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Collections
CREATE POLICY "Public collections are viewable by everyone"
  ON public.collections FOR SELECT
  USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can insert own collections"
  ON public.collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON public.collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON public.collections FOR DELETE
  USING (auth.uid() = user_id);

-- Images
CREATE POLICY "Images in public collections are viewable by everyone"
  ON public.images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE collections.id = images.collection_id
      AND (collections.is_public = true OR collections.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert images to own collections"
  ON public.images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE collections.id = collection_id
      AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own images"
  ON public.images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own images"
  ON public.images FOR DELETE
  USING (auth.uid() = user_id);

-- Pinned collections
CREATE POLICY "Users can view own pinned collections"
  ON public.pinned_collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pinned collections"
  ON public.pinned_collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pinned collections"
  ON public.pinned_collections FOR DELETE
  USING (auth.uid() = user_id);

-- Collection followers
CREATE POLICY "Users can view own followed collections"
  ON public.collection_followers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can follow collections"
  ON public.collection_followers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow collections"
  ON public.collection_followers FOR DELETE
  USING (auth.uid() = user_id);

-- Recent images
CREATE POLICY "Users can view own recent images"
  ON public.recent_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recent images"
  ON public.recent_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recent images"
  ON public.recent_images FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 10. Auto-create profile on signup
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();
