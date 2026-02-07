"use client";

import Image from "next/image";
import Link from "next/link";
import { trackRecentImage } from "@/lib/actions/discover";
import type { ExploreImage } from "@/lib/types/database";

interface ExploreCardProps {
  image: ExploreImage;
  supabaseUrl: string;
}

function getStorageUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/images/${path}`;
}

export function ExploreCard({ image, supabaseUrl }: ExploreCardProps) {
  const thumbnailUrl = getStorageUrl(
    supabaseUrl,
    image.thumbnail_path || image.file_path,
  );
  const fullUrl = getStorageUrl(supabaseUrl, image.file_path);

  function handleClick() {
    try {
      trackRecentImage(image.id);
    } catch {
      // silent fail for unauthed users
    }
  }

  return (
    <div className="group relative rounded-lg border bg-card overflow-hidden">
      <a
        href={fullUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block aspect-square relative bg-muted"
        onClick={handleClick}
      >
        <Image
          src={thumbnailUrl}
          alt={image.title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
        />
      </a>

      <div className="p-2">
        <p className="text-xs truncate">{image.title}</p>
        <Link
          href={`/collections/${image.collections.slug}`}
          className="text-xs text-muted-foreground hover:text-foreground truncate block transition-colors"
        >
          {image.collections.name} &middot;{" "}
          {image.collections.profiles.display_name ||
            image.collections.profiles.username}
        </Link>
      </div>
    </div>
  );
}
