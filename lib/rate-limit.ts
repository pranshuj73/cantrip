import { createClient } from "@/lib/supabase/server";

const LIMITS = {
  upload: { daily: 50, label: "uploads" },
  collection: { daily: 10, label: "collections" },
} as const;

const MIN_ACCOUNT_AGE_MS = 60 * 60 * 1000; // 1 hour

type Action = keyof typeof LIMITS;

export async function checkRateLimit(
  userId: string,
  action: Action,
): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "email_verified, account_created_at, daily_upload_count, last_upload_date, daily_collection_count, last_collection_date",
    )
    .eq("id", userId)
    .single();

  if (!profile) {
    return { allowed: false, reason: "Profile not found" };
  }

  if (!profile.email_verified) {
    return { allowed: false, reason: "Email must be verified before uploading" };
  }

  const accountAge = Date.now() - new Date(profile.account_created_at).getTime();
  if (accountAge < MIN_ACCOUNT_AGE_MS) {
    return {
      allowed: false,
      reason: "Account must be at least 1 hour old",
    };
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
