import { ExploreCard } from "@/components/explore-card";
import type { ExploreImage } from "@/lib/types/database";

interface ExploreGridProps {
  images: ExploreImage[];
  supabaseUrl: string;
}

export function ExploreGrid({ images, supabaseUrl }: ExploreGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {images.map((image) => (
        <ExploreCard
          key={image.id}
          image={image}
          supabaseUrl={supabaseUrl}
        />
      ))}
    </div>
  );
}
