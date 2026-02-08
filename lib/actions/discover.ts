"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ExploreImage, Collection, Image } from "@/lib/types/database";

export async function getExploreFeed(
  cursor?: string,
  limit = 25,
): Promise<{ images: ExploreImage[]; nextCursor: string | null }> {
  const supabase = await createClient();

  let q = supabase
    .from("images")
    .select(
      `id, title, description, thumbnail_path, file_path, blurhash, width, height, created_at, user_id, collection_id,
       collections!inner(id, name, slug, is_public, is_flagged, user_id)`,
    )
    .eq("collections.is_public", true)
    .eq("collections.is_flagged", false)
    .eq("is_flagged", false)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    q = q.lt("created_at", cursor);
  }

  const { data, error } = await q;

  if (error) {
    console.error("getExploreFeed error:", error.message, error.details, error.hint);
    return { images: [], nextCursor: null };
  }
  if (!data || data.length === 0) return { images: [], nextCursor: null };

  const hasMore = data.length > limit;
  const raw = hasMore ? data.slice(0, limit) : data;

  // Fetch profiles for the collection owners
  const ownerIds = [...new Set(raw.map((r) => {
    const col = Array.isArray(r.collections) ? r.collections[0] : r.collections;
    return col.user_id as string;
  }))];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .in("id", ownerIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, { username: p.username, display_name: p.display_name }]),
  );

  const images: ExploreImage[] = raw.map((row) => {
    const col = Array.isArray(row.collections) ? row.collections[0] : row.collections;
    const profile = profileMap.get(col.user_id) ?? { username: "unknown", display_name: null };
    return {
      ...row,
      collections: { id: col.id, name: col.name, slug: col.slug, is_public: col.is_public, user_id: col.user_id, profiles: profile },
    };
  });

  // Cursor is based on the last item before shuffling (chronological boundary)
  const nextCursor = hasMore ? raw[raw.length - 1].created_at : null;

  // Shuffle the batch so the feed feels fresh each visit
  for (let i = images.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [images[i], images[j]] = [images[j], images[i]];
  }

  return { images, nextCursor };
}

export async function searchPublicImages(
  query: string,
  limit = 50,
): Promise<ExploreImage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("images")
    .select(
      `id, title, description, thumbnail_path, file_path, blurhash, width, height, created_at, user_id, collection_id,
       collections!inner(id, name, slug, is_public, is_flagged, user_id)`,
    )
    .eq("collections.is_public", true)
    .eq("collections.is_flagged", false)
    .eq("is_flagged", false)
    .textSearch("search_vector", query, {
      type: "websearch",
      config: "english",
    })
    .limit(limit);

  if (error) {
    console.error("searchPublicImages error:", error.message, error.details, error.hint);
    return [];
  }
  if (!data || data.length === 0) return [];

  // Fetch profiles for collection owners
  const ownerIds = [...new Set(data.map((r) => {
    const col = Array.isArray(r.collections) ? r.collections[0] : r.collections;
    return col.user_id as string;
  }))];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .in("id", ownerIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, { username: p.username, display_name: p.display_name }]),
  );

  return data.map((row) => {
    const col = Array.isArray(row.collections) ? row.collections[0] : row.collections;
    const profile = profileMap.get(col.user_id) ?? { username: "unknown", display_name: null };
    return {
      ...row,
      collections: { id: col.id, name: col.name, slug: col.slug, is_public: col.is_public, user_id: col.user_id, profiles: profile },
    };
  });
}

export async function trackRecentImage(
  imageId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("recent_images").upsert(
    {
      user_id: user.id,
      image_id: imageId,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "user_id,image_id" },
  );

  if (error) return { error: error.message };
  return {};
}

export async function getRecentImages(limit = 12): Promise<Image[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("recent_images")
    .select("image_id, last_used_at, images(*)")
    .eq("user_id", user.id)
    .order("last_used_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data
    .map((r) => {
      const img = Array.isArray(r.images) ? r.images[0] : r.images;
      return img as Image | null;
    })
    .filter((img): img is Image => img !== null);
}

export async function pinCollection(
  collectionId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // Get next position
  const { count } = await supabase
    .from("pinned_collections")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { error } = await supabase.from("pinned_collections").insert({
    user_id: user.id,
    collection_id: collectionId,
    position: (count ?? 0) + 1,
  });

  if (error) return { error: error.message };

  revalidatePath("/collections");
  return {};
}

export async function unpinCollection(
  collectionId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("pinned_collections")
    .delete()
    .eq("user_id", user.id)
    .eq("collection_id", collectionId);

  if (error) return { error: error.message };

  revalidatePath("/collections");
  return {};
}

export async function getPinnedCollections(): Promise<Collection[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("pinned_collections")
    .select("collection_id, position, collections(*)")
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  if (error || !data) return [];
  return data
    .map((r) => {
      const col = Array.isArray(r.collections)
        ? r.collections[0]
        : r.collections;
      return col as Collection | null;
    })
    .filter((c): c is Collection => c !== null);
}

export async function getPinnedCollectionIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Set();

  const { data, error } = await supabase
    .from("pinned_collections")
    .select("collection_id")
    .eq("user_id", user.id);

  if (error || !data) return new Set();
  return new Set(data.map((r) => r.collection_id));
}

export async function followCollection(
  collectionId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("collection_followers").insert({
    user_id: user.id,
    collection_id: collectionId,
  });

  if (error) return { error: error.message };

  revalidatePath("/collections");
  revalidatePath("/library");
  return {};
}

export async function unfollowCollection(
  collectionId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("collection_followers")
    .delete()
    .eq("user_id", user.id)
    .eq("collection_id", collectionId);

  if (error) return { error: error.message };

  revalidatePath("/collections");
  revalidatePath("/library");
  return {};
}

export async function getFollowedCollections(): Promise<
  (Collection & { profiles: { username: string; display_name: string | null } })[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("collection_followers")
    .select("collection_id, collections(*, profiles(username, display_name))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data
    .map((r) => {
      const col = Array.isArray(r.collections)
        ? r.collections[0]
        : r.collections;
      if (!col) return null;
      const prof = Array.isArray(col.profiles)
        ? col.profiles[0]
        : col.profiles;
      return { ...col, profiles: prof } as Collection & {
        profiles: { username: string; display_name: string | null };
      };
    })
    .filter(
      (
        c,
      ): c is Collection & {
        profiles: { username: string; display_name: string | null };
      } => c !== null,
    );
}

export async function isCollectionFollowed(
  collectionId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { count } = await supabase
    .from("collection_followers")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("collection_id", collectionId);

  return (count ?? 0) > 0;
}
