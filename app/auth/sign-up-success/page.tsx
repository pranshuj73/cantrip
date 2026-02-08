import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex min-h-svh noise-bg items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <Link href="/" className="font-bold text-xl tracking-tight">
            Cantrip
          </Link>
        </div>
        <div className="space-y-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-accent" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Check your email
            </h1>
            <p className="text-sm text-muted-foreground">
              You&apos;ve successfully signed up. Please check your email to
              confirm your account before signing in.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="w-full h-11">
          <Link href="/auth/login">Back to sign in</Link>
        </Button>
      </div>
    </div>
  );
}
