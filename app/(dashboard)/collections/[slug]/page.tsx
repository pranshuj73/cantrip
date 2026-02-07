import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCollectionBySlug } from "@/lib/actions/collections";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Images, Pencil, ArrowLeft } from "lucide-react";
import Link from "next/link";

async function CollectionDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);

  if (!collection) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/collections"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Collections
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{collection.name}</h1>
            <Badge
              variant={collection.is_public ? "default" : "secondary"}
            >
              {collection.is_public ? "Public" : "Private"}
            </Badge>
          </div>
          {collection.description && (
            <p className="text-muted-foreground mt-1">
              {collection.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Images className="h-4 w-4" />
              {collection.image_count} images
            </span>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/collections/${collection.slug}/edit`}>
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        </Button>
      </div>

      {collection.image_count === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg">
          <Images className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium">No images yet</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Upload images to this collection to get started.
          </p>
        </div>
      )}
    </div>
  );
}

export default function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded" />
        </div>
      }
    >
      <CollectionDetail params={params} />
    </Suspense>
  );
}
