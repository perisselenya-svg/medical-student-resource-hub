import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms/LoginForm";
import { Logo } from "@/components/ui/logo";
import { getCurrentAdmin } from "@/lib/auth/guard";

export const metadata: Metadata = { title: "Admin sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  if (await getCurrentAdmin()) redirect("/admin/dashboard");
  const next = (await searchParams).next;
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex justify-center">
          <Logo />
        </Link>
        <div className="card p-6">
          <h1 className="mb-1 text-2xl font-bold text-ink">Admin sign in</h1>
          <p className="mb-5 text-sm text-slate-600">For site administrators only. Students don&apos;t need an account.</p>
          <LoginForm next={typeof next === "string" ? next : undefined} />
        </div>
      </div>
    </main>
  );
}
