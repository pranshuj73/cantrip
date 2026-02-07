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
- [x] Server Actions for collections CRUD (lib/actions/collections.ts)
- [x] Collections list page with search (app/(dashboard)/collections/page.tsx)
- [x] Create/edit collection UI with form component (components/collection-form.tsx)
- [x] Collection detail page (app/(dashboard)/collections/[slug]/page.tsx)
- [x] Collection actions dropdown — edit/delete (components/collection-actions.tsx)
- [x] Dashboard layout with nav (app/(dashboard)/layout.tsx)
- [x] Supabase Storage bucket (images) with RLS policies (supabase/migrations/00003_storage_buckets.sql)
- [x] Image upload API route with server-side validation, WebP conversion, thumbnails, blurhash, MD5 dedup (app/api/images/upload/route.ts)
- [x] Client-side bulk upload with browser-image-compression and progress tracking (lib/upload/bulk-upload.ts)
- [x] Image upload UI with drag-and-drop (components/image-upload.tsx)
- [x] Image grid display on collection detail page (components/image-grid.tsx, components/image-card.tsx)
- [x] Image server actions: fetch, delete, update title (lib/actions/images.ts)
- [x] Inline image title editing and delete with confirmation
- [x] User storage quota enforcement in upload route

- [x] Explore feed page with cursor-based pagination and Load More (app/(dashboard)/explore/page.tsx)
- [x] Public image search via tsvector full-text search (lib/actions/discover.ts)
- [x] Recent images tracking — upsert on image click (lib/actions/discover.ts, components/image-card.tsx, components/explore-card.tsx)
- [x] Library page with recent images + owned/followed collections tabs (app/(dashboard)/library/page.tsx, components/library-tabs.tsx)
- [x] Pin/unpin collections — dropdown menu item + pinned section on collections page (components/collection-actions.tsx, app/(dashboard)/collections/page.tsx)
- [x] Follow/unfollow collections — button on public collection detail pages (components/follow-button.tsx, app/(dashboard)/collections/[slug]/page.tsx)
- [x] Nav updated with Explore and Library links (app/(dashboard)/layout.tsx)

### 🚧 In Progress
<!-- Empty for now -->

### 📋 Planned

#### Phase 5: Social Features
- [x] Copy image to clipboard button on image cards (components/copy-image-button.tsx)
- [x] Profile settings page with avatar upload, username, display name, bio (app/(dashboard)/settings/profile/page.tsx)
- [x] Avatar upload API with sharp processing (app/api/avatar/upload/route.ts)
- [x] Avatars storage bucket migration (supabase/migrations/00005_avatars_bucket.sql)
- [x] Profile server actions — get/update profile, public collections (lib/actions/profile.ts)
- [x] User menu dropdown with avatar in nav (components/user-menu.tsx, components/auth-button.tsx)
- [x] Public user profile pages at /users/[username] (app/(dashboard)/users/[username]/page.tsx)
- [x] Username links throughout app — explore cards, collection detail, library tabs
- [ ] Add collection sharing

#### Phase 6: Offline Support
- [x] Implement Service Worker
- [x] Set up IndexedDB for offline storage
- [x] Add offline upload queue
- [x] Implement background sync
- [x] Create PWA manifest
- [x] Build offline indicator UI

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
