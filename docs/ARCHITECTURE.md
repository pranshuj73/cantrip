# Cantrip Backend Architecture

## Overview

Cantrip uses a serverless architecture powered by Next.js and Supabase. This document outlines the complete backend design including database schema, storage strategy, API design, and optimization patterns.

**Key Principles:**
- **Security first:** All authorization via Supabase Row Level Security (RLS)
- **Performance:** Aggressive indexing, denormalized counters, cursor-based pagination
- **Cost efficiency:** Optimized for Supabase free tier (aggressive compression, storage quotas)
- **Offline-first:** Full PWA support with Service Workers and IndexedDB

---

## Database Schema

### Tables

#### `profiles`
Extended user profile with quota and rate limiting fields.

```sql
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

-- Indexes
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_email_verified ON public.profiles(email_verified);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to reset daily counters
CREATE OR REPLACE FUNCTION reset_daily_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_upload_date < CURRENT_DATE THEN
    NEW.daily_upload_count = 0;
  END IF;
  IF NEW.last_collection_date < CURRENT_DATE THEN
    NEW.daily_collection_count = 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reset_daily_counters
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION reset_daily_counters();
```

#### `collections`
Collections with denormalized counters for performance.

```sql
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  slug TEXT UNIQUE NOT NULL,

  -- Denormalized counters (avoid COUNT queries)
  image_count INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0,

  -- Security
  is_flagged BOOLEAN DEFAULT false,
  flag_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_collections_user_id ON public.collections(user_id);
CREATE INDEX idx_collections_slug ON public.collections(slug);
CREATE INDEX idx_collections_is_public ON public.collections(is_public) WHERE is_public = true;
CREATE INDEX idx_collections_created_at ON public.collections(created_at DESC);
CREATE INDEX idx_collections_follower_count ON public.collections(follower_count DESC) WHERE is_public = true;

-- Composite index for user's collections query
CREATE INDEX idx_collections_user_created ON public.collections(user_id, created_at DESC);

-- Updated_at trigger
CREATE TRIGGER trigger_collections_updated_at
BEFORE UPDATE ON public.collections
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update image_count
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

-- Trigger to update follower_count
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
```

#### `images`
Image metadata with optimization and security fields.

```sql
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
  file_hash TEXT NOT NULL, -- MD5 for duplicate detection
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

-- Indexes
CREATE INDEX idx_images_collection_id ON public.images(collection_id);
CREATE INDEX idx_images_user_id ON public.images(user_id);
CREATE INDEX idx_images_file_hash ON public.images(file_hash);
CREATE INDEX idx_images_created_at ON public.images(created_at DESC);
CREATE INDEX idx_images_user_created ON public.images(user_id, created_at DESC);

-- GIN index for full-text search on title
CREATE INDEX idx_images_title_search ON public.images USING GIN (to_tsvector('english', title));

-- Composite index for public images feed
CREATE INDEX idx_images_public_feed ON public.images(created_at DESC)
WHERE is_flagged = false;

-- Updated_at trigger
CREATE TRIGGER trigger_images_updated_at
BEFORE UPDATE ON public.images
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update user storage quota
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
```

#### `pinned_collections`
User's pinned collections for quick access.

```sql
CREATE TABLE public.pinned_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, collection_id)
);

-- Indexes
CREATE INDEX idx_pinned_collections_user_id ON public.pinned_collections(user_id, position);
```

#### `collection_followers`
Track users following other users' public collections.

```sql
CREATE TABLE public.collection_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, collection_id)
);

-- Indexes
CREATE INDEX idx_collection_followers_user_id ON public.collection_followers(user_id);
CREATE INDEX idx_collection_followers_collection_id ON public.collection_followers(collection_id);
```

#### `recent_images`
Track recently used images per user for quick access.

```sql
CREATE TABLE public.recent_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, image_id)
);

-- Index for recent images query (sorted by last_used_at)
CREATE INDEX idx_recent_images_user_used ON public.recent_images(user_id, last_used_at DESC);
```

### Database Functions

#### Rate limit increment functions

```sql
-- Increment daily upload count
CREATE OR REPLACE FUNCTION increment_daily_upload_count(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET
    daily_upload_count = CASE
      WHEN last_upload_date = CURRENT_DATE THEN daily_upload_count + 1
      ELSE 1
    END,
    last_upload_date = CURRENT_DATE
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment daily collection count
CREATE OR REPLACE FUNCTION increment_daily_collection_count(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET
    daily_collection_count = CASE
      WHEN last_collection_date = CURRENT_DATE THEN daily_collection_count + 1
      ELSE 1
    END,
    last_collection_date = CURRENT_DATE
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Materialized Views

#### Trending Collections

```sql
-- Create materialized view for trending collections (refresh hourly)
CREATE MATERIALIZED VIEW trending_collections AS
SELECT
  c.id,
  c.name,
  c.slug,
  c.image_count,
  c.follower_count,
  c.created_at,
  p.username,
  p.display_name,
  -- Calculate trending score (more recent + more followers = higher score)
  (c.follower_count * 10) + (100.0 / (EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400 + 1)) as trending_score
FROM public.collections c
JOIN public.profiles p ON c.user_id = p.id
WHERE c.is_public = true
  AND c.is_flagged = false
  AND c.image_count > 0
ORDER BY trending_score DESC;

-- Create index on materialized view
CREATE INDEX idx_trending_collections_score ON trending_collections(trending_score DESC);

-- Refresh function (call from cron or periodically)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY trending_collections;
```

---

## Row Level Security (RLS) Policies

Enable RLS on all tables and create policies:

```sql
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinned_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_images ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Collections policies
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

-- Images policies
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

-- Pinned collections policies
CREATE POLICY "Users can view own pinned collections"
  ON public.pinned_collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pinned collections"
  ON public.pinned_collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pinned collections"
  ON public.pinned_collections FOR DELETE
  USING (auth.uid() = user_id);

-- Collection followers policies
CREATE POLICY "Users can view own followed collections"
  ON public.collection_followers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can follow collections"
  ON public.collection_followers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow collections"
  ON public.collection_followers FOR DELETE
  USING (auth.uid() = user_id);

-- Recent images policies
CREATE POLICY "Users can view own recent images"
  ON public.recent_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recent images"
  ON public.recent_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recent images"
  ON public.recent_images FOR UPDATE
  USING (auth.uid() = user_id);
```

---

## Storage Architecture

### Buckets

Create two storage buckets:

1. **`images`** - User-uploaded reaction images
2. **`avatars`** - User profile avatars

### File Organization

```
images/
  {user_id}/
    collections/
      {collection_id}/
        originals/
          {image_id}.webp
        thumbnails/
          {image_id}_thumb.webp
          {image_id}_medium.webp

avatars/
  {user_id}.webp
```

### Storage RLS Policies

```sql
-- Images bucket policies
CREATE POLICY "Public images are viewable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images' AND
    EXISTS (
      SELECT 1 FROM public.images i
      JOIN public.collections c ON i.collection_id = c.id
      WHERE i.file_path = name AND c.is_public = true
    )
  );

CREATE POLICY "Users can upload to own folders"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Avatars bucket policies
CREATE POLICY "Avatars are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    name = auth.uid()::text || '.webp'
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    name = auth.uid()::text || '.webp'
  );
```

### Thumbnail Strategy

- **thumb:** 400x400 (for grids/cards)
- **medium:** 800x800 (for modals/detail view)
- **original:** Max 2000x2000, WebP quality 85
- **Format:** All images converted to WebP
- **Blurhash:** Generated for progressive loading

---

## API Design

### Directory Structure

```
/app
  /api
    /images
      /upload
        route.ts          # POST - Upload image(s)
    /collections
      /[id]
        /images
          route.ts        # GET - List collection images
  /(dashboard)
    /collections
      page.tsx            # List user's collections
      /[slug]
        page.tsx          # View collection
        /edit
          page.tsx        # Edit collection
    /explore
      page.tsx            # Public feed
    /library
      page.tsx            # User's library (owned + followed)

/lib
  /actions
    /collections.ts       # Server Actions for collections
    /images.ts            # Server Actions for images
    /profiles.ts          # Server Actions for profiles
  /queries
    /collections.ts       # Database queries
    /images.ts            # Database queries
```

### Server Actions

Server Actions live in `/lib/actions/` and handle mutations.

**Example: Create collection**
```typescript
// lib/actions/collections.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createCollection(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const isPublic = formData.get('isPublic') === 'true'

  // Generate slug
  const slug = name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).slice(2, 9)

  const { data, error } = await supabase
    .from('collections')
    .insert({
      user_id: user.id,
      name,
      description,
      is_public: isPublic,
      slug
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/collections')
  return { data }
}
```

### API Routes

API routes handle uploads and external integrations.

**See Image Upload API section below for full implementation.**

---

## Rate Limiting Implementation

### Middleware

```typescript
// lib/middleware/rate-limit.ts
import { createClient } from '@/lib/supabase/server'

interface RateLimitConfig {
  maxRequests: number
  windowMinutes: number
  dailyLimit?: number
}

export async function checkRateLimit(
  userId: string,
  action: 'upload' | 'collection',
  config: RateLimitConfig
): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('daily_upload_count, daily_collection_count, email_verified, account_created_at')
    .eq('id', userId)
    .single()

  if (!profile) {
    return { allowed: false, reason: 'Profile not found' }
  }

  // Check email verification
  if (!profile.email_verified) {
    return { allowed: false, reason: 'Email verification required' }
  }

  // Check account age (1 hour minimum)
  const accountAge = Date.now() - new Date(profile.account_created_at).getTime()
  const oneHour = 60 * 60 * 1000
  if (accountAge < oneHour) {
    return { allowed: false, reason: 'Account too new' }
  }

  // Check daily limits
  if (action === 'upload') {
    if (profile.daily_upload_count >= (config.dailyLimit || 50)) {
      return { allowed: false, reason: 'Daily upload limit reached' }
    }
  } else if (action === 'collection') {
    if (profile.daily_collection_count >= (config.dailyLimit || 10)) {
      return { allowed: false, reason: 'Daily collection limit reached' }
    }
  }

  return { allowed: true }
}

export async function incrementRateLimit(
  userId: string,
  action: 'upload' | 'collection'
): Promise<void> {
  const supabase = await createClient()

  if (action === 'upload') {
    await supabase.rpc('increment_daily_upload_count', { user_id: userId })
  } else if (action === 'collection') {
    await supabase.rpc('increment_daily_collection_count', { user_id: userId })
  }
}
```

---

## Image Upload API

### Client-Side Compression

```typescript
// lib/upload/bulk-upload.ts
import imageCompression from 'browser-image-compression'

interface UploadProgress {
  file: File
  status: 'pending' | 'compressing' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  imageId?: string
}

export async function bulkUploadImages(
  files: File[],
  collectionId: string,
  onProgress: (progress: UploadProgress[]) => void
) {
  const MAX_CONCURRENT = 3
  const MAX_SIZE_MB = 2
  const MAX_DIMENSION = 2000

  const progressMap: Map<string, UploadProgress> = new Map()
  files.forEach(file => {
    progressMap.set(file.name, {
      file,
      status: 'pending',
      progress: 0
    })
  })

  const updateProgress = () => {
    onProgress(Array.from(progressMap.values()))
  }

  const processFile = async (file: File): Promise<void> => {
    const progress = progressMap.get(file.name)!

    try {
      // Validate
      if (!file.type.match(/^image\/(jpeg|png|gif|webp)$/)) {
        throw new Error('Invalid file type')
      }

      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        throw new Error(`File too large (max ${MAX_SIZE_MB}MB)`)
      }

      // Compress
      progress.status = 'compressing'
      updateProgress()

      const options = {
        maxSizeMB: MAX_SIZE_MB,
        maxWidthOrHeight: MAX_DIMENSION,
        useWebWorker: true,
        fileType: 'image/webp',
        initialQuality: 0.85
      }

      const compressedFile = await imageCompression(file, options)

      // Upload
      progress.status = 'uploading'
      updateProgress()

      const formData = new FormData()
      formData.append('file', compressedFile)
      formData.append('collectionId', collectionId)
      formData.append('title', file.name.replace(/\.[^/.]+$/, ''))

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const { image } = await response.json()

      progress.status = 'success'
      progress.progress = 100
      progress.imageId = image.id
      updateProgress()

    } catch (error) {
      progress.status = 'error'
      progress.error = error instanceof Error ? error.message : 'Unknown error'
      updateProgress()
    }
  }

  // Process in parallel
  const queue = [...files]
  while (queue.length > 0) {
    const batch = queue.splice(0, MAX_CONCURRENT)
    await Promise.all(batch.map(processFile))
  }

  return Array.from(progressMap.values())
}
```

### Server-Side Upload Route

```typescript
// app/api/images/upload/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { encode } from 'blurhash'
import crypto from 'crypto'
import { checkRateLimit, incrementRateLimit } from '@/lib/middleware/rate-limit'
import { fileTypeFromBuffer } from 'file-type'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const MAX_DIMENSION = 2000
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit check
  const rateLimitCheck = await checkRateLimit(user.id, 'upload', {
    maxRequests: 5,
    windowMinutes: 1,
    dailyLimit: 50
  })

  if (!rateLimitCheck.allowed) {
    return NextResponse.json({ error: rateLimitCheck.reason }, { status: 429 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File
  const collectionId = formData.get('collectionId') as string
  const title = formData.get('title') as string || file.name

  if (!file || !collectionId) {
    return NextResponse.json({ error: 'Missing file or collectionId' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())

    // Validate MIME type using magic bytes
    const fileType = await fileTypeFromBuffer(buffer)
    if (!fileType || !ALLOWED_TYPES.includes(fileType.mime)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Calculate file hash
    const fileHash = crypto.createHash('md5').update(buffer).digest('hex')

    // Check duplicates
    const { data: existingImage } = await supabase
      .from('images')
      .select('id, title, collections(name)')
      .eq('file_hash', fileHash)
      .eq('user_id', user.id)
      .single()

    if (existingImage) {
      return NextResponse.json({
        error: 'Duplicate image detected',
        existingImage
      }, { status: 409 })
    }

    // Check storage quota
    const { data: profile } = await supabase
      .from('profiles')
      .select('storage_used_bytes, storage_quota_bytes')
      .eq('id', user.id)
      .single()

    if (profile && profile.storage_used_bytes >= profile.storage_quota_bytes) {
      return NextResponse.json({ error: 'Storage quota exceeded' }, { status: 507 })
    }

    // Process image
    let image = sharp(buffer)
    const metadata = await image.metadata()

    if (metadata.width! > MAX_DIMENSION || metadata.height! > MAX_DIMENSION) {
      image = image.resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true
      })
    }

    // Convert to WebP
    const webpBuffer = await image.webp({ quality: 85, effort: 6 }).toBuffer()

    const finalImage = sharp(webpBuffer)
    const finalMetadata = await finalImage.metadata()

    // Generate blurhash
    const { data: pixels, info } = await finalImage
      .resize(32, 32, { fit: 'inside' })
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true })

    const blurhash = encode(
      new Uint8ClampedArray(pixels),
      info.width,
      info.height,
      4,
      4
    )

    // Generate thumbnail
    const thumbnailBuffer = await sharp(webpBuffer)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75, effort: 6 })
      .toBuffer()

    const imageId = crypto.randomUUID()
    const originalPath = `${user.id}/collections/${collectionId}/originals/${imageId}.webp`
    const thumbnailPath = `${user.id}/collections/${collectionId}/thumbnails/${imageId}_thumb.webp`

    // Upload to storage
    await supabase.storage
      .from('images')
      .upload(originalPath, webpBuffer, {
        contentType: 'image/webp',
        upsert: false
      })

    await supabase.storage
      .from('images')
      .upload(thumbnailPath, thumbnailBuffer, {
        contentType: 'image/webp',
        upsert: false
      })

    // Create DB record
    const { data: imageRecord, error: dbError } = await supabase
      .from('images')
      .insert({
        id: imageId,
        collection_id: collectionId,
        user_id: user.id,
        title,
        file_path: originalPath,
        thumbnail_path: thumbnailPath,
        original_size_bytes: file.size,
        compressed_size_bytes: webpBuffer.length,
        file_hash: fileHash,
        mime_type: 'image/webp',
        width: finalMetadata.width,
        height: finalMetadata.height,
        blurhash
      })
      .select()
      .single()

    if (dbError) throw dbError

    await incrementRateLimit(user.id, 'upload')

    return NextResponse.json({
      success: true,
      image: imageRecord,
      compressionRatio: ((1 - webpBuffer.length / file.size) * 100).toFixed(1) + '%'
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
```

---

## Query Optimization Patterns

### Cursor-Based Pagination

```typescript
// lib/queries/images.ts
import { createClient } from '@/lib/supabase/server'

export async function getExploreFeed(cursor?: string, limit = 50) {
  const supabase = await createClient()

  let query = supabase
    .from('images')
    .select(`
      id,
      title,
      thumbnail_path,
      blurhash,
      width,
      height,
      created_at,
      collections!inner(
        id,
        name,
        slug,
        is_public,
        profiles(username, display_name)
      )
    `)
    .eq('collections.is_public', true)
    .eq('is_flagged', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query

  if (error) throw error

  return {
    images: data,
    nextCursor: data.length === limit ? data[data.length - 1].created_at : null
  }
}
```

### Full-Text Search

```typescript
export async function searchImages(query: string, limit = 50) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('images')
    .select(`
      id,
      title,
      thumbnail_path,
      blurhash,
      collections!inner(id, name, slug, is_public)
    `)
    .textSearch('title', query, { type: 'websearch', config: 'english' })
    .eq('collections.is_public', true)
    .eq('is_flagged', false)
    .limit(limit)

  if (error) throw error
  return data
}
```

---

## Caching & Offline Strategy

### Service Worker

```typescript
// public/sw.js
const CACHE_NAME = 'cantrip-v1'
const ASSETS_TO_CACHE = [
  '/',
  '/explore',
  '/library',
  '/offline'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE)
    })
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Network-first for API calls
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Cache-first for images
  if (request.url.includes('/storage/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
          return response
        })
      })
    )
    return
  }

  // Network-first for everything else
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  )
})
```

### IndexedDB for Offline Data

```typescript
// lib/offline/db.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface CanTripDB extends DBSchema {
  collections: {
    key: string
    value: {
      id: string
      name: string
      images: any[]
      lastSynced: number
    }
  }
  uploadQueue: {
    key: string
    value: {
      id: string
      file: Blob
      collectionId: string
      title: string
      createdAt: number
    }
  }
}

let db: IDBPDatabase<CanTripDB>

export async function initDB() {
  db = await openDB<CanTripDB>('cantrip', 1, {
    upgrade(db) {
      db.createObjectStore('collections', { keyPath: 'id' })
      db.createObjectStore('uploadQueue', { keyPath: 'id' })
    }
  })
  return db
}

export async function getDB() {
  if (!db) {
    await initDB()
  }
  return db
}
```

---

## TypeScript Types

```typescript
// lib/types/database.ts
export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  storage_used_bytes: number
  storage_quota_bytes: number
  daily_upload_count: number
  last_upload_date: string | null
  daily_collection_count: number
  last_collection_date: string | null
  email_verified: boolean
  account_created_at: string
  created_at: string
  updated_at: string
}

export interface Collection {
  id: string
  user_id: string
  name: string
  description: string | null
  is_public: boolean
  slug: string
  image_count: number
  follower_count: number
  is_flagged: boolean
  flag_count: number
  created_at: string
  updated_at: string
}

export interface Image {
  id: string
  collection_id: string
  user_id: string
  title: string
  file_path: string
  thumbnail_path: string | null
  original_size_bytes: number
  compressed_size_bytes: number
  file_hash: string
  mime_type: string
  width: number | null
  height: number | null
  blurhash: string | null
  created_at: string
  updated_at: string
  is_flagged: boolean
  flag_count: number
}

export interface PinnedCollection {
  id: string
  user_id: string
  collection_id: string
  position: number
  created_at: string
}

export interface CollectionFollower {
  id: string
  user_id: string
  collection_id: string
  created_at: string
}

export interface RecentImage {
  id: string
  user_id: string
  image_id: string
  last_used_at: string
}
```

---

## Implementation Phases

### Phase 1: Core Database & Auth (Week 1)
- Create all database tables
- Implement RLS policies
- Add indexes and triggers
- Set up database functions
- Test auth flows

### Phase 2: Collections Management (Week 1-2)
- Server Actions for CRUD
- Collections list page
- Create/edit UI
- Collection search

### Phase 3: Image Upload & Storage (Week 2-3)
- Set up Storage buckets
- Image upload API
- Bulk upload UI
- Quota tracking

### Phase 4: Discovery Features (Week 3-4)
- Explore feed
- Image search
- Recent images
- Library view
- Pin/unpin

### Phase 5: Social Features (Week 4)
- Follow/unfollow
- User profiles
- Collection sharing

### Phase 6: Offline Support (Week 5)
- Service Worker
- IndexedDB
- Background sync
- PWA manifest

### Phase 7: Performance & Polish (Week 6)
- Image optimization
- Infinite scroll
- Rate limiting
- Security audit
- Performance testing

---

## Key Technical Decisions

### Why Server Components First?
- Faster initial page loads
- Better SEO
- Reduced JavaScript bundle
- Use 'use client' only when needed

### Why Server Actions for Mutations?
- Type-safe server functions
- Automatic revalidation
- Progressive enhancement
- No API routes needed for most mutations

### Why Supabase RLS?
- Security enforced at database level
- No need for authorization code in app
- Works with any client
- Can't be bypassed

### Why Aggressive Image Optimization?
- Supabase free tier: 1GB storage
- Need to support many users
- WebP: 80% smaller than PNG/JPG
- Thumbnails: fast loading in grids

### Why Rate Limiting in Database?
- Atomic operations
- No external service needed
- Simple to implement
- Scales with Supabase

### Why Cursor-Based Pagination?
- Faster than OFFSET (no table scan)
- Consistent results (no missed/duplicate items)
- Works well with real-time data
- Better UX for infinite scroll

---

## Security Considerations

### File Upload Security
- Magic byte validation (not just extension)
- File size limits (2MB max)
- MIME type whitelist
- Duplicate detection (prevent spam)
- Storage quota enforcement

### Rate Limiting
- 5 uploads per minute per user
- 50 uploads per day per user
- 10 collections per day
- Email verification required
- 1 hour account age minimum

### Content Moderation
- User reporting system
- Flag inappropriate content
- Auto-hide heavily flagged content
- Admin review dashboard (future)

### Database Security
- RLS on all tables
- Secure functions (SECURITY DEFINER)
- No SQL injection (parameterized queries)
- Minimal permissions (principle of least privilege)

---

## Performance Targets

- **Initial page load:** < 2s
- **Image feed:** < 1s to show first 20 images
- **Image upload:** < 5s per image (including compression)
- **Search results:** < 500ms
- **Offline mode:** Full functionality except uploads

---

## Free Tier Sustainability

### Supabase Free Tier Limits
- 500MB database
- 1GB storage
- 2GB bandwidth/month
- 50,000 monthly active users

### Optimization Strategies
- Aggressive WebP compression (saves 80%)
- Small thumbnail sizes (400x400, 800x800)
- User storage quotas (100MB per user)
- CDN caching (Supabase provides)
- Efficient queries (denormalized counters, indexes)

### Growth Plan
- Monitor storage usage
- Implement user quotas
- Upgrade when hitting 80% of limits
- Consider paid tier at ~1000 active users
