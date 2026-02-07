import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCollectionBySlug } from "@/lib/actions/collections";
import { CollectionForm } from "@/components/collection-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

async function EditCollectionDetail({
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
          href={`/collections/${collection.slug}`}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {collection.name}
        </Link>
      </div>
      <h1 className="text-2xl font-bold">Edit Collection</h1>
      <CollectionForm collection={collection} />
    </div>
  );
}

export default function EditCollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 w-full max-w-lg bg-muted rounded" />
        </div>
      }
    >
      <EditCollectionDetail params={params} />
    </Suspense>
  );
}
