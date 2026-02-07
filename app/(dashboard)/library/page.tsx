import { Suspense } from "react";
import {
  getRecentImages,
  getFollowedCollections,
} from "@/lib/actions/discover";
import { getMyCollections } from "@/lib/actions/collections";
import { getCollectionPreviewImages } from "@/lib/actions/images";
import { ImageGrid } from "@/components/image-grid";
import { LibraryTabs } from "@/components/library-tabs";
import { Clock, BookOpen } from "lucide-react";

async function LibraryContent() {
  const [recentImages, ownedCollections, followedCollections] =
    await Promise.all([
      getRecentImages(),
      getMyCollections(),
      getFollowedCollections(),
    ]);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const allCollectionIds = [
    ...ownedCollections.map((c) => c.id),
    ...followedCollections.map((c) => c.id),
  ];
  const previewImages = await getCollectionPreviewImages(allCollectionIds);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Library</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your recent images and collections
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Images
        </h2>
        {recentImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
            <Clock className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Images you view will appear here for quick access.
            </p>
          </div>
        ) : (
          <ImageGrid
            images={recentImages}
            supabaseUrl={supabaseUrl}
            isOwner={false}
          />
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Collections
        </h2>
        <LibraryTabs
          ownedCollections={ownedCollections}
          followedCollections={followedCollections}
          previewImages={previewImages}
          supabaseUrl={supabaseUrl}
        />
      </section>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <div>
            <div className="h-8 w-28 bg-muted rounded animate-pulse" />
            <div className="h-4 w-56 bg-muted rounded mt-2 animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-6 w-40 bg-muted rounded animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-lg border bg-card overflow-hidden animate-pulse"
                >
                  <div className="aspect-square bg-muted" />
                  <div className="p-2">
                    <div className="h-3 w-20 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-6 w-36 bg-muted rounded animate-pulse" />
            <div className="h-9 w-64 bg-muted rounded animate-pulse" />
          </div>
        </div>
      }
    >
      <LibraryContent />
    </Suspense>
  );
}
