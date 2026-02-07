"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { blurhashToDataURL } from "@/lib/blurhash-url";
import { Trash2, Pencil, Check, Loader2, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteImage, updateImage } from "@/lib/actions/images";
import { trackRecentImage } from "@/lib/actions/discover";
import type { Image as ImageType } from "@/lib/types/database";

interface ImageCardProps {
  image: ImageType;
  storageUrl: string;
  thumbnailUrl: string;
  isOwner: boolean;
}

export function ImageCard({
  image,
  storageUrl,
  thumbnailUrl,
  isOwner,
}: ImageCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [title, setTitle] = useState(image.title);
  const [description, setDescription] = useState(image.description ?? "");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const blurDataURL = useMemo(() => blurhashToDataURL(image.blurhash), [image.blurhash]);

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteImage(image.id);
    if (result.error) {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handleSave() {
    const titleChanged = title.trim() !== image.title;
    const descChanged = (description.trim() || null) !== (image.description || null);

    if (!titleChanged && !descChanged) {
      setEditOpen(false);
      return;
    }

    setIsSaving(true);
    const fields: { title?: string; description?: string } = {};
    if (titleChanged) fields.title = title;
    if (descChanged) fields.description = description;

    const result = await updateImage(image.id, fields);
    setIsSaving(false);
    if (!result.error) {
      setEditOpen(false);
    }
  }

  function handleOpenEdit() {
    setTitle(image.title);
    setDescription(image.description ?? "");
    setShowDeleteConfirm(false);
    setEditOpen(true);
  }

  return (
    <div className="group relative rounded-lg border bg-card overflow-hidden">
      <div
        role="button"
        className="block aspect-square relative bg-muted cursor-pointer"
        onClick={async () => {
          try {
            trackRecentImage(image.id);
          } catch {
            // silent fail
          }
          try {
            const img = new window.Image();
            img.crossOrigin = "anonymous";
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject();
              img.src = storageUrl;
            });
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext("2d")!.drawImage(img, 0, 0);
            const pngBlob = await new Promise<Blob>((resolve, reject) => {
              canvas.toBlob(
                (b) => (b ? resolve(b) : reject()),
                "image/png",
              );
            });
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": pngBlob }),
            ]);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            // Clipboard API not supported or permission denied
          }
        }}
      >
        <Image
          src={thumbnailUrl}
          alt={image.title}
          fill
          className="object-cover group-hover:opacity-60 transition-opacity"
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
          placeholder={blurDataURL ? "blur" : "empty"}
          blurDataURL={blurDataURL}
        />
        {copied ? (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black">
              <Check className="h-4 w-4 text-green-600" />
              Copied
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <div className="rounded-full bg-white p-3 shadow-md">
              <Copy className="h-6 w-6 text-black" />
            </div>
          </div>
        )}
        <a
          href={storageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-1.5 right-1.5 rounded-full bg-white/80 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-white"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3.5 w-3.5 text-black" />
        </a>
      </div>

      <div className="p-2">
        <div className="flex items-center justify-between gap-1">
          <div className="flex-1 min-w-0">
            <p className="text-xs truncate">{image.title}</p>
            {image.description && (
              <p className="text-xs text-muted-foreground truncate">
                {image.description}
              </p>
            )}
          </div>
          {isOwner && (
            <button
              onClick={handleOpenEdit}
              className="flex items-center gap-1 rounded-full bg-white text-black px-2 py-0.5 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-gray-100"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
                placeholder="Image title"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tags or description for search..."
                className="resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex !justify-between">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-destructive">Delete?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Yes, delete"
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
