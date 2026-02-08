import { ForgotPasswordForm } from "@/components/forgot-password-form";
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
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
