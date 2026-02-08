import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Sparkles, Images, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

async function HomeContent() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) {
    redirect("/collections");
  }

  return (
    <main className="min-h-screen flex flex-col noise-bg">
      {/* Nav */}
      <nav className="w-full border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4">
          <Link
            href="/"
            className="font-bold text-lg tracking-tight"
          >
            Cantrip
          </Link>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <Suspense>
              <AuthButton />
            </Suspense>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex-1 flex flex-col items-center justify-center px-4 py-24 overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 grid-pattern opacity-40" />

        {/* Floating decorative cards */}
        <div className="absolute top-[15%] left-[8%] w-20 h-20 rounded-lg bg-accent/10 border border-accent/20 animate-float hidden lg:block" />
        <div className="absolute top-[25%] right-[12%] w-16 h-16 rounded-lg bg-accent/8 border border-accent/15 rotate-12 animate-float-delayed hidden lg:block" />
        <div className="absolute bottom-[20%] left-[15%] w-14 h-14 rounded-lg bg-accent/6 border border-accent/10 -rotate-6 animate-float-slow hidden lg:block" />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="animate-fade-up inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent text-sm font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            Your reaction image library
          </div>

          {/* Headline */}
          <h1
            className="animate-fade-up text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.08]"
            style={{ animationDelay: "100ms" }}
          >
            Collect the images
            <br />
            <span className="text-accent">that say it all</span>
          </h1>

          {/* Subhead */}
          <p
            className="animate-fade-up text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed"
            style={{ animationDelay: "200ms" }}
          >
            Organize your reaction images into collections, discover new ones
            from others, and have the perfect response ready in an instant.
          </p>

          {/* CTA */}
          <div
            className="animate-fade-up flex flex-col sm:flex-row items-center justify-center gap-3"
            style={{ animationDelay: "300ms" }}
          >
            <Button
              asChild
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 text-base"
            >
              <Link href="/auth/sign-up">Get started free</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="px-8 text-base">
              <Link href="/explore">Browse the feed</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/40 bg-card/50">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Images className="h-5 w-5" />}
              title="Curate collections"
              description="Organize your reaction images into themed collections. Public or private, it's your call."
              delay="400ms"
            />
            <FeatureCard
              icon={<Users className="h-5 w-5" />}
              title="Discover & follow"
              description="Explore public collections from other users. Follow your favorites to keep them close."
              delay="500ms"
            />
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Instant access"
              description="Copy any image to clipboard in one click. Recent images are always at hand."
              delay="600ms"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span className="font-medium text-foreground/70">Cantrip</span>
          <span>Collect. Discover. React.</span>
        </div>
      </footer>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: string;
}) {
  return (
    <div
      className="animate-fade-up group p-6 rounded-lg border border-border/60 bg-background hover:border-accent/30 transition-colors"
      style={{ animationDelay: delay }}
    >
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-accent/10 text-accent mb-4 group-hover:bg-accent/15 transition-colors">
        {icon}
      </div>
      <h3 className="font-semibold text-base mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
