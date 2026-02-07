import Image from "next/image";
import { FolderOpen } from "lucide-react";

interface CollectionPreviewProps {
  thumbnails: string[];
  supabaseUrl: string;
}

export function CollectionPreview({
  thumbnails,
  supabaseUrl,
}: CollectionPreviewProps) {
  if (thumbnails.length === 0) {
    return (
      <div className="aspect-video rounded-t-lg bg-muted flex items-center justify-center">
        <FolderOpen className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  const cells = [0, 1, 2, 3];

  return (
    <div className="aspect-video rounded-t-lg overflow-hidden grid grid-cols-2 grid-rows-2">
      {cells.map((i) =>
        thumbnails[i] ? (
          <div key={i} className="relative">
            <Image
              src={`${supabaseUrl}/storage/v1/object/public/images/${thumbnails[i]}`}
              alt=""
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
            />
          </div>
        ) : (
          <div key={i} className="bg-muted" />
        ),
      )}
    </div>
  );
}
