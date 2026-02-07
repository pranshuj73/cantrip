# Cantrip TODO

## Frontend
<!-- To be filled in later -->

## Backend

### ✅ Completed
- [x] Supabase authentication (email/password, OAuth, magic links)
- [x] Server/client Supabase client setup
- [x] Protected route middleware
- [x] Basic project structure
- [x] Database schema (profiles, collections, images, pinned_collections, collection_followers, recent_images)
- [x] Row Level Security (RLS) policies for all tables
- [x] Aggressive indexing (GIN full-text search, B-tree, composite, partial indexes)
- [x] Database triggers (image_count, follower_count, storage_used_bytes, updated_at, daily counter reset)
- [x] Database functions (increment_daily_upload_count, increment_daily_collection_count)
- [x] Auto-create profile on signup trigger
- [x] TypeScript types for all database entities (lib/types/database.ts)

### 🚧 In Progress
<!-- Empty for now -->

### 📋 Planned

#### Phase 2: Collections Management
- [ ] Create Server Actions for collections CRUD
- [ ] Build collections list page
- [ ] Build create/edit collection UI
- [ ] Implement collection search

#### Phase 3: Image Upload & Storage
- [ ] Set up Supabase Storage buckets (images, avatars)
- [ ] Configure storage RLS policies
- [ ] Build image upload API route with:
  - Client-side compression (browser-image-compression)
  - Server-side validation (MIME type, size, dimensions)
  - Aggressive WebP conversion (quality 75-85)
  - Thumbnail generation (400x400, 800x800)
  - Blurhash generation for progressive loading
  - MD5 hash for duplicate detection
- [ ] Create bulk upload UI component (multi-file picker, parallel processing)
- [ ] Add per-file progress tracking
- [ ] Implement user storage quota tracking
- [ ] Add image title editing

#### Phase 4: Discovery Features
- [ ] Build explore feed page (Pinterest-style)
- [ ] Implement image search
- [ ] Create recent images tracking system
- [ ] Build library view (owned + followed collections)
- [ ] Add pin/unpin collections functionality

#### Phase 5: Social Features
- [ ] Implement follow/unfollow collections
- [ ] Add follower counts
- [ ] Build user profile pages
- [ ] Add collection sharing

#### Phase 6: Offline Support
- [ ] Implement Service Worker
- [ ] Set up IndexedDB for offline storage
- [ ] Add offline upload queue
- [ ] Implement background sync
- [ ] Create PWA manifest
- [ ] Build offline indicator UI

#### Phase 7: Performance & Polish
- [ ] Optimize image loading:
  - Lazy loading with Intersection Observer
  - Blurhash placeholders for progressive loading
  - Virtual scrolling for large lists (react-window)
- [ ] Add infinite scroll to explore feed with cursor-based pagination
- [ ] Implement optimistic UI updates
- [ ] Add comprehensive loading states and error handling
- [ ] Add rate limiting middleware:
  - 5 uploads per minute per user
  - 50 uploads per day per user
  - 10 collection creations per day
  - Request throttling for API routes
- [ ] Implement security features:
  - Server-side MIME type validation (magic bytes)
  - Duplicate image detection (MD5 hash comparison)
  - User storage quota enforcement (100MB per user)
  - Email verification requirement for uploads
  - Account age check (1 hour minimum)
- [ ] Performance testing and optimization
- [ ] Security audit of RLS policies
