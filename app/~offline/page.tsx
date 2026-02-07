import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center space-y-4">
        <WifiOff className="h-12 w-12 text-muted-foreground mx-auto" />
        <h1 className="text-2xl font-semibold">You are offline</h1>
        <p className="text-muted-foreground max-w-sm">
          Check your internet connection. Images you&apos;ve already viewed are
          still available in your cached library.
        </p>
      </div>
    </div>
  );
}
