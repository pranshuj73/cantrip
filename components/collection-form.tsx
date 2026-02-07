"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createCollection,
  updateCollection,
  type CollectionFormState,
} from "@/lib/actions/collections";
import type { Collection } from "@/lib/types/database";

export function CollectionForm({
  collection,
}: {
  collection?: Collection;
}) {
  const action = collection ? updateCollection : createCollection;
  const [state, formAction, isPending] = useActionState<
    CollectionFormState,
    FormData
  >(action, {});

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>
          {collection ? "Edit Collection" : "New Collection"}
        </CardTitle>
        <CardDescription>
          {collection
            ? "Update your collection details."
            : "Create a new collection to organize your reaction images."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {collection && (
            <input type="hidden" name="id" value={collection.id} />
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Funny Cats"
              required
              maxLength={100}
              defaultValue={collection?.name}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              placeholder="What kind of images will you put here?"
              maxLength={500}
              defaultValue={collection?.description ?? ""}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isPublic"
              name="isPublic"
              defaultChecked={collection?.is_public ?? false}
            />
            <Label htmlFor="isPublic" className="font-normal">
              Make this collection public
            </Label>
          </div>

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending
              ? collection
                ? "Saving..."
                : "Creating..."
              : collection
                ? "Save Changes"
                : "Create Collection"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
