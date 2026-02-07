import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Suspense } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-6">
            <Link href="/collections" className="font-semibold text-lg">
              Cantrip
            </Link>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link
                href="/collections"
                className="hover:text-foreground transition-colors"
              >
                Collections
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <Suspense>
              <AuthButton />
            </Suspense>
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {children}
      </main>
    </div>
  );
}
