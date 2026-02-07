import imageCompression from "browser-image-compression";

export type UploadStatus =
  | "pending"
  | "compressing"
  | "uploading"
  | "success"
  | "error";

export interface UploadProgress {
  fileId: string;
  fileName: string;
  status: UploadStatus;
  progress: number; // 0-100
  error?: string;
  imageId?: string;
}

export interface FileMetadata {
  title: string;
  description: string;
}

const MAX_CONCURRENT = 3;
const MAX_RAW_SIZE = 10 * 1024 * 1024; // 10MB raw before compression
const ALLOWED_TYPES = /^image\/(jpeg|png|gif|webp)$/;

export function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.test(file.type)) {
    return "Invalid file type. Allowed: JPEG, PNG, GIF, WebP";
  }
  if (file.size > MAX_RAW_SIZE) {
    return "File exceeds 10MB limit";
  }
  return null;
}

export async function bulkUploadImages(
  files: File[],
  collectionId: string,
  metadata: Map<string, FileMetadata>,
  onProgress: (progress: UploadProgress[]) => void,
): Promise<UploadProgress[]> {
  const progressMap = new Map<string, UploadProgress>();
  const fileMap = new Map<string, File>();

  // Initialize progress for all files
  for (const file of files) {
    const fileId = crypto.randomUUID();
    fileMap.set(fileId, file);

    const error = validateFile(file);
    const entry: UploadProgress = {
      fileId,
      fileName: file.name,
      status: error ? "error" : "pending",
      progress: 0,
      error: error ?? undefined,
    };

    progressMap.set(fileId, entry);
  }

  const emit = () => onProgress(Array.from(progressMap.values()));
  emit();

  // Get valid file IDs
  const validIds = Array.from(progressMap.entries())
    .filter(([, p]) => p.status === "pending")
    .map(([id]) => id);

  // Process in chunks of MAX_CONCURRENT
  for (let i = 0; i < validIds.length; i += MAX_CONCURRENT) {
    const chunk = validIds.slice(i, i + MAX_CONCURRENT);
    await Promise.all(
      chunk.map((fileId) => {
        const file = fileMap.get(fileId)!;
        const fileMeta = findMetadata(file, metadata);
        return processFile(
          fileId,
          file,
          collectionId,
          fileMeta,
          progressMap,
          emit,
        );
      }),
    );
  }

  return Array.from(progressMap.values());
}

function findMetadata(
  file: File,
  metadata: Map<string, FileMetadata>,
): FileMetadata {
  // Try to find metadata by filename
  const meta = metadata.get(file.name);
  if (meta) return meta;
  // Fallback
  return {
    title: file.name.replace(/\.[^/.]+$/, ""),
    description: "",
  };
}

async function processFile(
  fileId: string,
  file: File,
  collectionId: string,
  metadata: FileMetadata,
  progressMap: Map<string, UploadProgress>,
  emit: () => void,
) {
  const update = (patch: Partial<UploadProgress>) => {
    const current = progressMap.get(fileId)!;
    progressMap.set(fileId, { ...current, ...patch });
    emit();
  };

  try {
    // Compress
    update({ status: "compressing", progress: 10 });

    const compressed = await imageCompression(file, {
      maxSizeMB: 2,
      maxWidthOrHeight: 2000,
      useWebWorker: true,
      fileType: "image/webp",
      initialQuality: 0.85,
    });

    update({ status: "uploading", progress: 50 });

    // Upload
    const formData = new FormData();
    formData.append("file", compressed);
    formData.append("collectionId", collectionId);
    formData.append("title", metadata.title);
    formData.append("description", metadata.description);
    formData.append("originalSize", String(file.size));

    const response = await fetch("/api/images/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      update({ status: "error", progress: 0, error: result.error });
      return;
    }

    update({
      status: "success",
      progress: 100,
      imageId: result.image?.id,
    });
  } catch (err) {
    update({
      status: "error",
      progress: 0,
      error: err instanceof Error ? err.message : "Upload failed",
    });
  }
}
