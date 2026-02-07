"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { ExploreGrid } from "@/components/explore-grid";
import { getExploreFeed } from "@/lib/actions/discover";
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
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (!cursor || isPending) return;
    startTransition(async () => {
      const result = await getExploreFeed(cursor);
      setImages((prev) => [...prev, ...result.images]);
      setCursor(result.nextCursor);
    });
  }, [cursor, isPending]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="space-y-6">
      <ExploreGrid images={images} supabaseUrl={supabaseUrl} />
      {cursor && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {isPending && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
      )}
    </div>
  );
}
