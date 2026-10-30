import Link from "next/link";
import { LogoMark } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <LogoMark className="h-12 w-12" />
      <h1 className="mt-4 text-3xl font-bold text-ink">Page not found</h1>
      <p className="mt-2 text-slate-600">This resource may have been moved, unpublished, or never existed.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/library" className="btn-primary">
          Browse the library
        </Link>
        <Link href="/" className="btn-secondary">
          Home
        </Link>
      </div>
    </main>
  );
}
