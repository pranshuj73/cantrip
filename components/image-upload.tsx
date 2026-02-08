"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  bulkUploadImages,
  validateFile,
  type UploadProgress,
  type FileMetadata,
} from "@/lib/upload/bulk-upload";
import {
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  ImagePlus,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ImageUploadProps {
  collectionId: string;
}

interface PendingFile {
  file: File;
  preview: string;
  title: string;
  description: string;
  error: string | null;
}

export function ImageUpload({ collectionId }: ImageUploadProps) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const failedFilesRef = useRef<Map<string, { file: File; metadata: FileMetadata }>>(new Map());
  const router = useRouter();

  const openDialog = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const pending: PendingFile[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      title: file.name.replace(/\.[^/.]+$/, ""),
      description: "",
      error: validateFile(file),
    }));

    setPendingFiles(pending);
    setDialogOpen(true);
  }, []);

  const handleUpload = useCallback(async () => {
    const validFiles = pendingFiles.filter((p) => !p.error);
    if (validFiles.length === 0) return;

    // Build metadata map keyed by filename
    const metadata = new Map<string, FileMetadata>();
    for (const p of validFiles) {
      metadata.set(p.file.name, {
        title: p.title.trim() || p.file.name.replace(/\.[^/.]+$/, ""),
        description: p.description.trim(),
      });
    }

    setDialogOpen(false);
    setIsUploading(true);

    // Revoke preview URLs
    for (const p of pendingFiles) {
      URL.revokeObjectURL(p.preview);
    }

    // Store files for potential retry
    for (const p of validFiles) {
      const meta = metadata.get(p.file.name);
      if (meta) {
        failedFilesRef.current.set(p.file.name, { file: p.file, metadata: meta });
      }
    }

    const results = await bulkUploadImages(
      validFiles.map((p) => p.file),
      collectionId,
      metadata,
      (progress) => {
        setUploads([...progress]);
      },
    );

    // Clear successful files from retry map
    for (const r of results) {
      if (r.status === "success") {
        failedFilesRef.current.delete(r.fileName);
      }
    }

    setIsUploading(false);
    setPendingFiles([]);
    router.refresh();
  }, [pendingFiles, collectionId, router]);

  const handleRetryFailed = useCallback(async () => {
    const failedUploads = uploads.filter((u) => u.status === "error");
    if (failedUploads.length === 0) return;

    const filesToRetry: File[] = [];
    const metadata = new Map<string, FileMetadata>();

    for (const failed of failedUploads) {
      const stored = failedFilesRef.current.get(failed.fileName);
      if (stored) {
        filesToRetry.push(stored.file);
        metadata.set(stored.file.name, stored.metadata);
      }
    }

    if (filesToRetry.length === 0) return;

    // Keep successful uploads, remove failed ones (they'll be re-added by bulkUpload)
    setUploads((prev) => prev.filter((u) => u.status !== "error"));
    setIsUploading(true);

    const results = await bulkUploadImages(
      filesToRetry,
      collectionId,
      metadata,
      (progress) => {
        setUploads((prev) => {
          const kept = prev.filter((u) => u.status !== "error" && u.status !== "pending" && u.status !== "compressing" && u.status !== "uploading");
          return [...kept, ...progress];
        });
      },
    );

    for (const r of results) {
      if (r.status === "success") {
        failedFilesRef.current.delete(r.fileName);
      }
    }

    setIsUploading(false);
    router.refresh();
  }, [uploads, collectionId, router]);

  const handleCloseDialog = useCallback(() => {
    for (const p of pendingFiles) {
      URL.revokeObjectURL(p.preview);
    }
    setPendingFiles([]);
    setDialogOpen(false);
  }, [pendingFiles]);

  const updatePending = useCallback(
    (index: number, patch: Partial<PendingFile>) => {
      setPendingFiles((prev) =>
        prev.map((p, i) => (i === index ? { ...p, ...patch } : p)),
      );
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      openDialog(e.dataTransfer.files);
    },
    [openDialog],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const validCount = useMemo(
    () => pendingFiles.filter((p) => !p.error).length,
    [pendingFiles],
  );
  const successCount = uploads.filter((u) => u.status === "success").length;
  const errorCount = uploads.filter((u) => u.status === "error").length;
  const isDone = uploads.length > 0 && !isUploading;

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors
          ${isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"}
          ${isUploading ? "pointer-events-none opacity-50" : ""}
        `}
      >
        <ImagePlus className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Drag images here or click to browse
        </p>
        <p className="text-xs text-muted-foreground">
          JPEG, PNG, GIF, or WebP up to 10MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) openDialog(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Metadata dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Upload Images</DialogTitle>
            <DialogDescription>
              Add titles and descriptions to help find your images later.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {pendingFiles.map((pending, index) => (
              <div
                key={index}
                className={`flex gap-4 rounded-lg border p-3 ${pending.error ? "border-destructive/50 bg-destructive/5" : ""}`}
              >
                {/* Thumbnail preview */}
                <div className="shrink-0 w-20 h-20 rounded overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pending.preview}
                    alt={pending.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 space-y-2">
                  {pending.error && (
                    <p className="text-sm text-destructive">{pending.error}</p>
                  )}
                  <div>
                    <Label htmlFor={`title-${index}`} className="text-xs">
                      Title
                    </Label>
                    <Input
                      id={`title-${index}`}
                      value={pending.title}
                      onChange={(e) =>
                        updatePending(index, { title: e.target.value })
                      }
                      placeholder="Image title"
                      className="h-8 text-sm"
                      disabled={!!pending.error}
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor={`description-${index}`}
                      className="text-xs"
                    >
                      Description
                    </Label>
                    <Textarea
                      id={`description-${index}`}
                      value={pending.description}
                      onChange={(e) =>
                        updatePending(index, {
                          description: e.target.value,
                        })
                      }
                      placeholder="Tags or description for search..."
                      className="resize-none text-sm min-h-[60px]"
                      rows={2}
                      disabled={!!pending.error}
                    />
                  </div>
                </div>
              </div>
            ))}

            {pendingFiles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No files selected
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={validCount === 0}>
              Upload {validCount} {validCount === 1 ? "image" : "images"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {isDone && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {successCount} of {uploads.length} uploaded
                {errorCount > 0 && ` (${errorCount} failed)`}
              </p>
              <div className="flex items-center gap-1">
                {errorCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRetryFailed}
                  >
                    <RotateCw className="h-3.5 w-3.5 mr-1" />
                    Retry failed
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUploads([]);
                    failedFilesRef.current.clear();
                  }}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {[...uploads].sort((a, b) => {
              const order = { compressing: 0, uploading: 1, pending: 2, queued: 3, error: 4, success: 5 };
              return (order[a.status] ?? 2) - (order[b.status] ?? 2);
            }).map((upload) => (
              <div
                key={upload.fileId}
                className="flex items-center gap-2 text-sm py-1"
              >
                <StatusIcon status={upload.status} />
                <span className="truncate flex-1">{upload.fileName}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  <StatusText status={upload.status} error={upload.error} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: UploadProgress["status"] }) {
  switch (status) {
    case "pending":
      return <Upload className="h-4 w-4 text-muted-foreground shrink-0" />;
    case "compressing":
    case "uploading":
      return (
        <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
      );
    case "success":
      return (
        <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400 shrink-0" />
      );
    case "error":
      return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
    case "queued":
      return <Upload className="h-4 w-4 text-yellow-500 dark:text-yellow-400 shrink-0" />;
  }
}

function StatusText({
  status,
  error,
}: {
  status: UploadProgress["status"];
  error?: string;
}) {
  switch (status) {
    case "pending":
      return "Waiting...";
    case "compressing":
      return "Compressing...";
    case "uploading":
      return "Uploading...";
    case "success":
      return "Done";
    case "error":
      return error || "Failed";
    case "queued":
      return "Queued for sync";
  }
}
