"use client";

import { useState } from "react";
import Image from "next/image";
import { Trash2, Pencil, Check, X, Loader2 } from "lucide-react";
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
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteImage(image.id);
    if (result.error) {
      setIsDeleting(false);
      setShowConfirm(false);
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
    setEditOpen(true);
  }

  return (
    <div className="group relative rounded-lg border bg-card overflow-hidden">
      <a
        href={storageUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block aspect-square relative bg-muted"
        onClick={() => {
          try {
            trackRecentImage(image.id);
          } catch {
            // silent fail
          }
        }}
      >
        <Image
          src={thumbnailUrl}
          alt={image.title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
        />
      </a>

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
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={handleOpenEdit}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              {showConfirm ? (
                <div className="flex items-center gap-0.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => setShowConfirm(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-destructive"
                  onClick={() => setShowConfirm(true)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
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
          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
