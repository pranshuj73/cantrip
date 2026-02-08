import { LoginForm } from "@/components/login-form";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex min-h-svh noise-bg">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-accent/5 border-r border-border/40 items-center justify-center">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="relative z-10 max-w-md px-12 space-y-6">
          <Link href="/" className="font-bold text-2xl tracking-tight">
            Cantrip
          </Link>
          <p className="text-3xl font-bold tracking-tight leading-snug">
            The perfect reaction,
            <br />
            <span className="text-accent">always within reach.</span>
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Organize your reaction images, discover new ones, and never be
            caught without the right response again.
          </p>
        </div>
        {/* Decorative floating elements */}
        <div className="absolute top-[20%] right-[15%] w-16 h-16 rounded-lg bg-accent/10 border border-accent/20 rotate-6 animate-float" />
        <div className="absolute bottom-[25%] right-[25%] w-12 h-12 rounded-lg bg-accent/8 border border-accent/15 -rotate-3 animate-float-delayed" />
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden text-center space-y-1">
            <Link href="/" className="font-bold text-xl tracking-tight">
              Cantrip
            </Link>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
