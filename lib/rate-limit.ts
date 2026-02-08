import { createClient } from "@/lib/supabase/server";

const LIMITS = {
  upload: { daily: 100, label: "uploads" },
  collection: { daily: 10, label: "collections" },
} as const;

type Action = keyof typeof LIMITS;

export async function checkRateLimit(
  userId: string,
  action: Action,
): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "email_verified, daily_upload_count, last_upload_date, daily_collection_count, last_collection_date",
    )
    .eq("id", userId)
    .single();

  if (!profile) {
    return { allowed: false, reason: "Profile not found" };
  }

  // Check actual auth state for email verification (profiles.email_verified
  // is a snapshot from signup and may be stale after OAuth linking)
  if (!profile.email_verified) {
    const { data: { user } } = await supabase.auth.getUser();
    const isVerified = !!user?.email_confirmed_at;
    if (isVerified) {
      // Sync the stale profile field
      await supabase
        .from("profiles")
        .update({ email_verified: true })
        .eq("id", userId);
    } else {
      return { allowed: false, reason: "Email must be verified before uploading" };
    }
  }

  const limit = LIMITS[action];
  const today = new Date().toISOString().slice(0, 10);

  const lastDate =
    action === "upload" ? profile.last_upload_date : profile.last_collection_date;
  const dailyCount =
    action === "upload" ? profile.daily_upload_count : profile.daily_collection_count;

  // If last date isn't today, the counter has effectively reset
  const effectiveCount = lastDate?.slice(0, 10) === today ? dailyCount : 0;

  if (effectiveCount >= limit.daily) {
    return {
      allowed: false,
      reason: `Daily limit of ${limit.daily} ${limit.label} reached. Try again tomorrow.`,
    };
  }

  return { allowed: true };
}
