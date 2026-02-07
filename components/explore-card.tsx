"use client";

import Image from "next/image";
import Link from "next/link";
import { trackRecentImage } from "@/lib/actions/discover";
import { CopyImageButton } from "@/components/copy-image-button";
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
        <div className="flex items-center justify-between gap-1">
          <p className="text-xs truncate flex-1 min-w-0">{image.title}</p>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyImageButton imageUrl={fullUrl} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          <Link
            href={`/collections/${image.collections.slug}`}
            className="hover:text-foreground transition-colors"
          >
            {image.collections.name}
          </Link>
          {" "}&middot;{" "}
          <Link
            href={`/users/${image.collections.profiles.username}`}
            className="hover:text-foreground transition-colors"
          >
            {image.collections.profiles.display_name ||
              image.collections.profiles.username}
          </Link>
        </p>
      </div>
    </div>
  );
}
