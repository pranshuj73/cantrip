import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;

  return (
    <p className="text-sm text-muted-foreground">
      {params?.error
        ? `Error: ${params.error}`
        : "An unspecified error occurred."}
    </p>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  return (
    <div className="flex min-h-svh noise-bg items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <Link href="/" className="font-bold text-xl tracking-tight">
            Cantrip
          </Link>
        </div>
        <div className="space-y-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Something went wrong
            </h1>
            <Suspense>
              <ErrorContent searchParams={searchParams} />
            </Suspense>
          </div>
        </div>
        <Button asChild variant="outline" className="w-full h-11">
          <Link href="/auth/login">Back to sign in</Link>
        </Button>
      </div>
    </div>
  );
}
