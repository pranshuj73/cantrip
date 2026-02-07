import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCollectionBySlug } from "@/lib/actions/collections";
import { getCollectionImages } from "@/lib/actions/images";
import { createClient } from "@/lib/supabase/server";
import { isCollectionFollowed } from "@/lib/actions/discover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/image-upload";
import { ImageGrid } from "@/components/image-grid";
import { FollowButton } from "@/components/follow-button";
import { ShareCollectionButton } from "@/components/share-collection-button";
import { Images, Pencil, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

async function CollectionDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);

  if (!collection) {
    notFound();
  }

  const supabase = await createClient();
  const [images, { data: { user } }] = await Promise.all([
    getCollectionImages(collection.id),
    supabase.auth.getUser(),
  ]);

  const isOwner = user?.id === collection.user_id;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const showFollow = !isOwner && user && collection.is_public;
  const isFollowing = showFollow
    ? await isCollectionFollowed(collection.id)
    : false;

  // Fetch owner profile for non-owners
  let ownerProfile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null = null;
  if (!isOwner) {
    const { data } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", collection.user_id)
      .single();
    ownerProfile = data;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/collections"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Collections
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{collection.name}</h1>
            <Badge
              variant={collection.is_public ? "default" : "secondary"}
            >
              {collection.is_public ? "Public" : "Private"}
            </Badge>
          </div>
          {collection.description && (
            <p className="text-muted-foreground mt-1">
              {collection.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Images className="h-4 w-4" />
              {collection.image_count} images
            </span>
            {!isOwner && ownerProfile && (
              <Link
                href={`/users/${ownerProfile.username}`}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <div className="relative h-5 w-5 rounded-full overflow-hidden bg-muted shrink-0">
                  {ownerProfile.avatar_url ? (
                    <Image
                      src={ownerProfile.avatar_url}
                      alt={ownerProfile.display_name || ownerProfile.username}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                      {(ownerProfile.display_name || ownerProfile.username)[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                {ownerProfile.display_name || ownerProfile.username}
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {collection.is_public && (
            <ShareCollectionButton slug={collection.slug} />
          )}
          {showFollow && (
            <FollowButton
              collectionId={collection.id}
              isFollowing={isFollowing}
            />
          )}
          {isOwner && (
            <Button variant="outline" asChild>
              <Link href={`/collections/${collection.slug}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      {isOwner && <ImageUpload collectionId={collection.id} />}

      {images.length > 0 ? (
        <ImageGrid
          images={images}
          supabaseUrl={supabaseUrl}
          isOwner={isOwner}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg">
          <Images className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium">No images yet</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {isOwner
              ? "Upload images to this collection to get started."
              : "This collection has no images yet."}
          </p>
        </div>
      )}
    </div>
  );
}

export default function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded" />
        </div>
      }
    >
      <CollectionDetail params={params} />
    </Suspense>
  );
}
