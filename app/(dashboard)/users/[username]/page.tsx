import { Suspense } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  getProfileByUsername,
  getPublicCollectionsByUserId,
} from "@/lib/actions/profile";
import { Badge } from "@/components/ui/badge";
import { Images, FolderOpen } from "lucide-react";

async function UserProfile({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  const collections = await getPublicCollectionsByUserId(profile.id);

  return (
    <div className="space-y-8">
      {/* Profile header */}
      <div className="flex items-center gap-6">
        <div className="relative h-24 w-24 rounded-full overflow-hidden bg-muted shrink-0">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.display_name || profile.username}
              fill
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-3xl font-medium text-muted-foreground">
              {(profile.display_name || profile.username)[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div>
          {profile.display_name && (
            <h1 className="text-2xl font-bold">{profile.display_name}</h1>
          )}
          <p className="text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
        </div>
      </div>

      {/* Public collections */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Public Collections</h2>
        {collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
            <FolderOpen className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No public collections yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((c) => (
              <Link
                key={c.id}
                href={`/collections/${c.slug}`}
                className="group rounded-lg border bg-card p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-medium truncate group-hover:underline">
                  {c.name}
                </h3>
                {c.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {c.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Images className="h-3 w-3" />
                    {c.image_count}
                  </span>
                  <Badge variant="default" className="text-xs">
                    Public
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-8 animate-pulse">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 bg-muted rounded-full" />
            <div className="space-y-2">
              <div className="h-8 w-48 bg-muted rounded" />
              <div className="h-4 w-32 bg-muted rounded" />
            </div>
          </div>
          <div className="h-6 w-40 bg-muted rounded" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      }
    >
      <UserProfile params={params} />
    </Suspense>
  );
}
