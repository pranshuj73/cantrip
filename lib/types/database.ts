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
  description: string | null
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
