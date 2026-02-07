"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Images } from "lucide-react";
import type { Collection } from "@/lib/types/database";

interface LibraryTabsProps {
  ownedCollections: Collection[];
  followedCollections: (Collection & {
    profiles: { username: string; display_name: string | null };
  })[];
}

function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <div className="group relative rounded-lg border bg-card p-4 hover:shadow-md transition-shadow">
      <Link
        href={`/collections/${collection.slug}`}
        className="flex-1 min-w-0"
      >
        <h3 className="font-medium truncate group-hover:underline">
          {collection.name}
        </h3>
        {collection.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {collection.description}
          </p>
        )}
      </Link>
      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Images className="h-3 w-3" />
          {collection.image_count}
        </span>
        <Badge
          variant={collection.is_public ? "default" : "secondary"}
          className="text-xs"
        >
          {collection.is_public ? "Public" : "Private"}
        </Badge>
      </div>
    </div>
  );
}

export function LibraryTabs({
  ownedCollections,
  followedCollections,
}: LibraryTabsProps) {
  return (
    <Tabs defaultValue="owned">
      <TabsList>
        <TabsTrigger value="owned">
          My Collections ({ownedCollections.length})
        </TabsTrigger>
        <TabsTrigger value="following">
          Following ({followedCollections.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="owned" className="mt-4">
        {ownedCollections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No collections yet.{" "}
              <Link
                href="/collections/new"
                className="text-foreground underline"
              >
                Create one
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ownedCollections.map((c) => (
              <CollectionCard key={c.id} collection={c} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="following" className="mt-4">
        {followedCollections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              You&apos;re not following any collections yet.{" "}
              <Link href="/explore" className="text-foreground underline">
                Explore
              </Link>{" "}
              to find some.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {followedCollections.map((c) => (
              <div
                key={c.id}
                className="group relative rounded-lg border bg-card p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <Link href={`/collections/${c.slug}`}>
                    <h3 className="font-medium truncate group-hover:underline">
                      {c.name}
                    </h3>
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    by{" "}
                    <Link
                      href={`/users/${c.profiles.username}`}
                      className="hover:text-foreground transition-colors"
                    >
                      {c.profiles.display_name || c.profiles.username}
                    </Link>
                  </p>
                  {c.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {c.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Images className="h-3 w-3" />
                    {c.image_count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
