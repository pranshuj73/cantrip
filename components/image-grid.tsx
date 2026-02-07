import { ImageCard } from "@/components/image-card";
import type { Image } from "@/lib/types/database";

interface ImageGridProps {
  images: Image[];
  supabaseUrl: string;
  isOwner: boolean;
}

function getStorageUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/images/${path}`;
}

export function ImageGrid({ images, supabaseUrl, isOwner }: ImageGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {images.map((image) => (
        <ImageCard
          key={image.id}
          image={image}
          storageUrl={getStorageUrl(supabaseUrl, image.file_path)}
          thumbnailUrl={getStorageUrl(
            supabaseUrl,
            image.thumbnail_path || image.file_path,
          )}
          isOwner={isOwner}
        />
      ))}
    </div>
  );
}
