"use client";

import { useOptimistic, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { followCollection, unfollowCollection } from "@/lib/actions/discover";
import { UserPlus, UserMinus } from "lucide-react";

interface FollowButtonProps {
  collectionId: string;
  isFollowing: boolean;
}

export function FollowButton({ collectionId, isFollowing }: FollowButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticFollowing, setOptimisticFollowing] = useOptimistic(isFollowing);

  function handleClick() {
    startTransition(async () => {
      setOptimisticFollowing(!optimisticFollowing);
      if (optimisticFollowing) {
        await unfollowCollection(collectionId);
      } else {
        await followCollection(collectionId);
      }
    });
  }

  return (
    <Button
      variant={optimisticFollowing ? "outline" : "default"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {optimisticFollowing ? (
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
