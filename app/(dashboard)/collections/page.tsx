import { Suspense } from "react";
import { getMyCollections } from "@/lib/actions/collections";
import {
  getPinnedCollections,
  getPinnedCollectionIds,
} from "@/lib/actions/discover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderOpen, Images, Search, Pin } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { CollectionActions } from "@/components/collection-actions";
import { CollectionPreview } from "@/components/collection-preview";
import { getCollectionPreviewImages } from "@/lib/actions/images";
import type { Collection } from "@/lib/types/database";

function CollectionCard({
  collection,
  isPinned,
  thumbnails,
  supabaseUrl,
}: {
  collection: Collection;
  isPinned: boolean;
  thumbnails: string[];
  supabaseUrl: string;
}) {
  return (
    <div className="group relative rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow">
      <Link href={`/collections/${collection.slug}`}>
        <CollectionPreview thumbnails={thumbnails} supabaseUrl={supabaseUrl} />
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <Link
            href={`/collections/${collection.slug}`}
            className="flex-1 min-w-0"
          >
            <h3 className="font-medium truncate group-hover:underline">
              {collection.name}
            </h3>
            {collection.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {collection.description}
              </p>
            )}
          </Link>
          <CollectionActions collection={collection} isPinned={isPinned} />
        </div>
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Images className="h-3 w-3" />
            {collection.image_count}
          </span>
          <Badge
            variant={collection.is_public ? "default" : "secondary"}
            className="text-xs"
          >
            {collection.is_public ? "Public" : "Private"}
          </Badge>
        </div>
      </div>
    </div>
  );
}

async function CollectionsContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [collections, pinnedCollections, pinnedIds] = await Promise.all([
    getMyCollections(q),
    getPinnedCollections(),
    getPinnedCollectionIds(),
  ]);

  const allIds = [
    ...collections.map((c) => c.id),
    ...pinnedCollections.map((c) => c.id),
  ];
  const uniqueIds = [...new Set(allIds)];
  const previewImages = await getCollectionPreviewImages(uniqueIds);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const isSearching = !!(q && q.trim());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Collections</h1>
        <Button asChild>
          <Link href="/collections/new">
            <Plus className="h-4 w-4" />
            New Collection
          </Link>
        </Button>
      </div>

      <form className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          name="q"
          placeholder="Search collections..."
          defaultValue={q}
          className="pl-9"
        />
      </form>

      {!isSearching && pinnedCollections.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Pin className="h-3.5 w-3.5" />
            Pinned
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pinnedCollections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                isPinned={true}
                thumbnails={previewImages[collection.id] || []}
                supabaseUrl={supabaseUrl}
              />
            ))}
          </div>
        </section>
      )}

      {collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          {isSearching ? (
            <>
              <h2 className="text-lg font-medium">No results found</h2>
              <p className="text-muted-foreground text-sm mt-1">
                No collections matching &quot;{q}&quot;
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-medium">No collections yet</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Create your first collection to start organizing reaction
                images.
              </p>
              <Button asChild className="mt-4">
                <Link href="/collections/new">
                  <Plus className="h-4 w-4" />
                  Create Collection
                </Link>
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              isPinned={pinnedIds.has(collection.id)}
              thumbnails={previewImages[collection.id] || []}
              supabaseUrl={supabaseUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-8 w-40 bg-muted rounded animate-pulse" />
            <div className="h-9 w-36 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-9 bg-muted rounded animate-pulse" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-lg border bg-card p-4 animate-pulse"
              >
                <div className="h-5 w-32 bg-muted rounded" />
                <div className="h-4 w-48 bg-muted rounded mt-2" />
                <div className="h-3 w-20 bg-muted rounded mt-3" />
              </div>
            ))}
          </div>
        </div>
      }
    >
      <CollectionsContent searchParams={searchParams} />
    </Suspense>
  );
}
