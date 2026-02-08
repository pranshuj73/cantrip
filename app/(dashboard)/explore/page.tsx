import { Suspense } from "react";
import { getExploreFeed } from "@/lib/actions/discover";
import { LoadMoreFeed } from "@/components/load-more-feed";
import { ExploreSearch } from "@/components/explore-search";
import { Compass } from "lucide-react";

async function ExploreContent() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const { images, nextCursor } = await getExploreFeed();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Explore</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Discover reaction images from the community
        </p>
      </div>

      <ExploreSearch supabaseUrl={supabaseUrl}>
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Compass className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium">Nothing here yet</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Public images from the community will appear here.
            </p>
          </div>
        ) : (
          <LoadMoreFeed
            initialImages={images}
            initialCursor={nextCursor}
            supabaseUrl={supabaseUrl}
          />
        )}
      </ExploreSearch>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div>
            <div className="h-8 w-32 bg-muted rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded mt-2 animate-pulse" />
          </div>
          <div className="h-9 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="rounded-lg border bg-card overflow-hidden animate-pulse"
              >
                <div className="aspect-square bg-muted" />
                <div className="p-2 space-y-1">
                  <div className="h-3 w-20 bg-muted rounded" />
                  <div className="h-3 w-28 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
