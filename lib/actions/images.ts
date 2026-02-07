"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Image } from "@/lib/types/database";

export async function getCollectionImages(
  collectionId: string,
): Promise<Image[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("images")
    .select("*")
    .eq("collection_id", collectionId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data as Image[];
}

export async function deleteImage(
  imageId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Fetch image to get storage paths
  const { data: image } = await supabase
    .from("images")
    .select("file_path, thumbnail_path, collection_id")
    .eq("id", imageId)
    .eq("user_id", user.id)
    .single();

  if (!image) {
    return { error: "Image not found" };
  }

  // Delete storage files
  const filesToDelete = [image.file_path];
  if (image.thumbnail_path) filesToDelete.push(image.thumbnail_path);
  await supabase.storage.from("images").remove(filesToDelete);

  // Delete DB record (triggers handle counter updates)
  const { error } = await supabase
    .from("images")
    .delete()
    .eq("id", imageId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/collections");
  return {};
}

export async function updateImage(
  imageId: string,
  fields: { title?: string; description?: string },
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const update: Record<string, string | null> = {};

  if (fields.title !== undefined) {
    if (!fields.title.trim()) {
      return { error: "Title is required" };
    }
    update.title = fields.title.trim();
  }

  if (fields.description !== undefined) {
    update.description = fields.description.trim() || null;
  }

  if (Object.keys(update).length === 0) {
    return {};
  }

  const { error } = await supabase
    .from("images")
    .update(update)
    .eq("id", imageId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/collections");
  return {};
}
