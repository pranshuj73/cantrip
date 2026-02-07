"use client";

import { useState, useTransition } from "react";
import { ExploreGrid } from "@/components/explore-grid";
import { getExploreFeed } from "@/lib/actions/discover";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { ExploreImage } from "@/lib/types/database";

interface LoadMoreFeedProps {
  initialImages: ExploreImage[];
  initialCursor: string | null;
  supabaseUrl: string;
}

export function LoadMoreFeed({
  initialImages,
  initialCursor,
  supabaseUrl,
}: LoadMoreFeedProps) {
  const [images, setImages] = useState(initialImages);
  const [cursor, setCursor] = useState(initialCursor);
  const [isPending, startTransition] = useTransition();

  function handleLoadMore() {
    if (!cursor) return;
    startTransition(async () => {
      const result = await getExploreFeed(cursor);
      setImages((prev) => [...prev, ...result.images]);
      setCursor(result.nextCursor);
    });
  }

  return (
    <div className="space-y-6">
      <ExploreGrid images={images} supabaseUrl={supabaseUrl} />
      {cursor && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
