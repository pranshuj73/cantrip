"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { followCollection, unfollowCollection } from "@/lib/actions/discover";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";

interface FollowButtonProps {
  collectionId: string;
  isFollowing: boolean;
}

export function FollowButton({ collectionId, isFollowing }: FollowButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      if (isFollowing) {
        await unfollowCollection(collectionId);
      } else {
        await followCollection(collectionId);
      }
    });
  }

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="h-4 w-4" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          Follow
        </>
      )}
    </Button>
  );
}
