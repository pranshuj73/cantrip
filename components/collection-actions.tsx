"use client";

import { MoreHorizontal, Pencil, Trash2, Pin, PinOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { deleteCollection } from "@/lib/actions/collections";
import { pinCollection, unpinCollection } from "@/lib/actions/discover";
import type { Collection } from "@/lib/types/database";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CollectionActionsProps {
  collection: Collection;
  isPinned?: boolean;
}

export function CollectionActions({
  collection,
  isPinned = false,
}: CollectionActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${collection.name}"? This cannot be undone.`)) {
      return;
    }
    setIsDeleting(true);
    await deleteCollection(collection.id);
    setIsDeleting(false);
  }

  async function handleTogglePin() {
    if (isPinned) {
      await unpinCollection(collection.id);
    } else {
      await pinCollection(collection.id);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={isDeleting}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleTogglePin}>
          {isPinned ? (
            <>
              <PinOff className="h-4 w-4" />
              Unpin
            </>
          ) : (
            <>
              <Pin className="h-4 w-4" />
              Pin
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push(`/collections/${collection.slug}/edit`)}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
