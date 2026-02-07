# Cantrip - Context Restoration Guide

## What is Cantrip?

Cantrip is a web application for organizing and discovering reaction images. Think Pinterest, but specifically for reaction images. Users can create collections, upload images, search their library, and explore a feed of public reaction images from other users.

### Core Features
- **Authentication:** Google OAuth, email & magic link (Supabase Auth)
- **Collections:** Create public/private collections, upload images with titles
- **Search & Discovery:** Search by collection/image name, explore public feed
- **Social:** Follow collections, pin favorites, quick access to recent images
- **Offline:** Full offline support with caching and background sync

## Understanding the Current State

To gain full context about the project, read these files in order:

### 1. Tech Stack & Dependencies
- **Read:** `package.json` - Current dependencies and scripts
- **Stack:** Next.js 15, React 19, TypeScript, Supabase, Tailwind CSS, Radix UI

### 2. Backend Architecture
- **Read:** `docs/ARCHITECTURE.md` - Complete backend design
- **Covers:** Database schema, RLS policies, Storage setup, API design, caching strategy, implementation phases

### 3. Implementation Status
- **Read:** `docs/TODO.md` - What's done vs. what's planned
- **Sections:** Frontend (TBD), Backend (7 implementation phases)

### 4. Project Structure
```
/app                    # Next.js App Router
  /auth                 # Authentication pages (✅ implemented)
  /protected            # Protected routes (✅ middleware configured)
  /(future routes)      # Collections, explore, library (📋 planned)
/components             # React components
  /ui                   # Radix UI components
  /auth-*               # Auth forms (✅ implemented)
/lib                    # Utilities and helpers
  /supabase             # Supabase clients (✅ configured)
    /client.ts          # Browser client
    /server.ts          # Server client (use in Server Actions)
    /proxy.ts           # Session middleware
  /actions              # Server Actions (📋 to be created)
  /offline              # Offline utilities (📋 to be created)
/docs                   # Documentation
  /ARCHITECTURE.md      # Backend architecture
  /TODO.md              # Implementation roadmap
```

## Development Guidelines

### Code Organization
- **Server Components by default** - Only use 'use client' when needed
- **Server Actions for mutations** - Located in `lib/actions/`
- **Supabase clients:**
  - Server-side: Use `createClient()` from `lib/supabase/server.ts`
  - Client-side: Use `createBrowserClient()` from `lib/supabase/client.ts`

### Security
- All authorization via Supabase RLS policies (defined in ARCHITECTURE.md)
- Never bypass RLS - security enforced at database level
- Validate inputs, sanitize uploads, respect privacy settings

### Styling
- Tailwind CSS with `cn()` utility from `lib/utils.ts`
- Radix UI components in `components/ui/`
- Dark mode via `next-themes` (already configured in layout)

### Environment Variables
Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/publishable key

## Next Steps

When starting work:
1. Check `docs/TODO.md` for current phase
2. Reference `docs/ARCHITECTURE.md` for technical details
3. Follow existing patterns in `/app/auth` and `/lib/supabase`
4. Update `docs/TODO.md` as features are completed

## Documentation Files

- **CLAUDE.md** (this file) - Context restoration guide, project overview
- **docs/ARCHITECTURE.md** - Complete backend architecture and technical design
- **docs/TODO.md** - Implementation roadmap and status tracking
- **README.md** - Starter kit documentation (will be updated for Cantrip)
- **package.json** - Current tech stack and dependencies
