import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/actions/profile";
import { ProfileForm } from "@/components/profile-form";

async function ProfileSettings() {
  const profile = await getMyProfile();

  if (!profile) {
    redirect("/auth/login");
  }

  return <ProfileForm profile={profile} />;
}

export default function ProfileSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Suspense
        fallback={
          <div className="space-y-4 animate-pulse max-w-lg">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-20 w-20 bg-muted rounded-full" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        }
      >
        <ProfileSettings />
      </Suspense>
    </div>
  );
}
