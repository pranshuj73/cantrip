"use server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Collection } from "@/lib/types/database";

export type CollectionFormState = {
  error?: string;
  data?: Collection;
};

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 9)
  );
}

export async function createCollection(
  _prevState: CollectionFormState,
  formData: FormData,
): Promise<CollectionFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to create a collection." };
  }

  const rateCheck = await checkRateLimit(user.id, "collection");
  if (!rateCheck.allowed) {
    return { error: rateCheck.reason };
  }

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const isPublic = formData.get("isPublic") === "on";

  if (!name || name.trim().length === 0) {
    return { error: "Collection name is required." };
  }

  if (name.length > 100) {
    return { error: "Collection name must be under 100 characters." };
  }

  const slug = generateSlug(name.trim());

  const { data, error } = await supabase
    .from("collections")
    .insert({
      user_id: user.id,
      name: name.trim(),
      description: description?.trim() || null,
      is_public: isPublic,
      slug,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  await supabase.rpc("increment_daily_collection_count", {
    p_user_id: user.id,
  });

  revalidatePath("/collections");
  redirect(`/collections/${data.slug}`);
}

export async function updateCollection(
  _prevState: CollectionFormState,
  formData: FormData,
): Promise<CollectionFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const isPublic = formData.get("isPublic") === "on";

  if (!id) {
    return { error: "Collection ID is required." };
  }

  if (!name || name.trim().length === 0) {
    return { error: "Collection name is required." };
  }

  if (name.length > 100) {
    return { error: "Collection name must be under 100 characters." };
  }

  const { data, error } = await supabase
    .from("collections")
    .update({
      name: name.trim(),
      description: description?.trim() || null,
      is_public: isPublic,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/collections");
  revalidatePath(`/collections/${data.slug}`);
  redirect(`/collections/${data.slug}`);
}

export async function deleteCollection(
  collectionId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", collectionId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/collections");
  redirect("/collections");
}

export async function getMyCollections(query?: string): Promise<Collection[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  let q = supabase
    .from("collections")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (query && query.trim()) {
    q = q.ilike("name", `%${query.trim()}%`);
  }

  const { data, error } = await q;

  if (error) return [];
  return data as Collection[];
}

export async function getCollectionBySlug(
  slug: string,
): Promise<Collection | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data as Collection;
}
