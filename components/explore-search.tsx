"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { searchPublicImages } from "@/lib/actions/discover";
import { ExploreGrid } from "@/components/explore-grid";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import type { ExploreImage } from "@/lib/types/database";

interface ExploreSearchProps {
  supabaseUrl: string;
  children: React.ReactNode;
}

export function ExploreSearch({ supabaseUrl, children }: ExploreSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExploreImage[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const images = await searchPublicImages(trimmed);
        setResults(images);
      });
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const isSearching = query.trim().length > 0;

  return (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search public images..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {isSearching ? (
        results !== null && (
          results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-lg font-medium">No results found</h2>
              <p className="text-muted-foreground text-sm mt-1">
                No images matching &quot;{query.trim()}&quot;
              </p>
            </div>
          ) : (
            <ExploreGrid images={results} supabaseUrl={supabaseUrl} />
          )
        )
      ) : (
        children
      )}
    </>
  );
}
