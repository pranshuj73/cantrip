import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import crypto from "crypto";
import sharp from "sharp";
import { encode } from "blurhash";
import { fileTypeFromBuffer } from "file-type";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_DIMENSION = 2000;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    const rateCheck = await checkRateLimit(user.id, "upload");
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.reason }, { status: 429 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const collectionId = formData.get("collectionId") as string | null;
    const rawTitle = formData.get("title") as string | null;
    const rawDescription = formData.get("description") as string | null;
    const originalSize = formData.get("originalSize") as string | null;

    if (!file || !collectionId) {
      return NextResponse.json(
        { error: "File and collectionId are required" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 2MB limit" },
        { status: 400 },
      );
    }

    // Magic-byte MIME validation
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileType = await fileTypeFromBuffer(buffer);

    if (
      !fileType ||
      !ALLOWED_TYPES.includes(fileType.mime as (typeof ALLOWED_TYPES)[number])
    ) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP" },
        { status: 400 },
      );
    }

    // Verify user owns the collection
    const { data: collection } = await supabase
      .from("collections")
      .select("id")
      .eq("id", collectionId)
      .eq("user_id", user.id)
      .single();

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found or not owned by you" },
        { status: 404 },
      );
    }

    // MD5 hash for duplicate detection
    const fileHash = crypto.createHash("md5").update(buffer).digest("hex");

    const { data: existing } = await supabase
      .from("images")
      .select("id, title")
      .eq("file_hash", fileHash)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          error: `Duplicate image: "${existing.title}" already exists`,
          existingImage: existing,
        },
        { status: 409 },
      );
    }

    // Storage quota check
    const { data: profile } = await supabase
      .from("profiles")
      .select("storage_used_bytes, storage_quota_bytes")
      .eq("id", user.id)
      .single();

    if (profile && profile.storage_used_bytes >= profile.storage_quota_bytes) {
      return NextResponse.json(
        { error: "Storage quota exceeded" },
        { status: 507 },
      );
    }

    // Image processing with sharp
    let image = sharp(buffer);
    const metadata = await image.metadata();

    if (
      (metadata.width && metadata.width > MAX_DIMENSION) ||
      (metadata.height && metadata.height > MAX_DIMENSION)
    ) {
      image = image.resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    const webpBuffer = await image
      .webp({ quality: 85, effort: 6 })
      .toBuffer();
    const finalMetadata = await sharp(webpBuffer).metadata();

    // Blurhash generation
    const { data: pixels, info } = await sharp(webpBuffer)
      .resize(32, 32, { fit: "inside" })
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });

    const blurhash = encode(
      new Uint8ClampedArray(pixels),
      info.width,
      info.height,
      4,
      4,
    );

    // Thumbnail generation (400x400)
    const thumbnailBuffer = await sharp(webpBuffer)
      .resize(400, 400, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 75, effort: 6 })
      .toBuffer();

    // Upload to Supabase Storage
    const imageId = crypto.randomUUID();
    const basePath = `${user.id}/collections/${collectionId}`;
    const originalPath = `${basePath}/originals/${imageId}.webp`;
    const thumbnailPath = `${basePath}/thumbnails/${imageId}_thumb.webp`;

    const { error: origError } = await supabase.storage
      .from("images")
      .upload(originalPath, webpBuffer, {
        contentType: "image/webp",
        upsert: false,
      });

    if (origError) {
      return NextResponse.json(
        { error: `Storage upload failed: ${origError.message}` },
        { status: 500 },
      );
    }

    const { error: thumbError } = await supabase.storage
      .from("images")
      .upload(thumbnailPath, thumbnailBuffer, {
        contentType: "image/webp",
        upsert: false,
      });

    if (thumbError) {
      // Cleanup the original that was uploaded
      await supabase.storage.from("images").remove([originalPath]);
      return NextResponse.json(
        { error: `Thumbnail upload failed: ${thumbError.message}` },
        { status: 500 },
      );
    }

    // Title defaults to filename without extension
    const title =
      rawTitle?.trim() || file.name.replace(/\.[^/.]+$/, "") || "Untitled";
    const description = rawDescription?.trim() || null;

    // Create DB record
    const { data: imageRecord, error: dbError } = await supabase
      .from("images")
      .insert({
        id: imageId,
        collection_id: collectionId,
        user_id: user.id,
        title,
        description,
        file_path: originalPath,
        thumbnail_path: thumbnailPath,
        original_size_bytes: parseInt(originalSize || "0") || file.size,
        compressed_size_bytes: webpBuffer.length,
        file_hash: fileHash,
        mime_type: "image/webp",
        width: finalMetadata.width ?? null,
        height: finalMetadata.height ?? null,
        blurhash,
      })
      .select()
      .single();

    if (dbError) {
      // Cleanup storage files on DB failure
      await supabase.storage
        .from("images")
        .remove([originalPath, thumbnailPath]);
      return NextResponse.json(
        { error: `Database insert failed: ${dbError.message}` },
        { status: 500 },
      );
    }

    // Increment daily upload count
    await supabase.rpc("increment_daily_upload_count", {
      p_user_id: user.id,
    });

    return NextResponse.json({
      success: true,
      image: imageRecord,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
