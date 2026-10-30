import { site } from "@/lib/seo/site";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" className="fill-brand-900" />
      <path d="M7 10.5c3-1.4 6-1.4 9 0v12c-3-1.4-6-1.4-9 0z" className="fill-teal-200" />
      <path d="M25 10.5c-3-1.4-6-1.4-9 0v12c3-1.4 6-1.4 9 0z" className="fill-white" />
      <path d="M19.5 13.2h1.6v1.7h1.7v1.6h-1.7v1.7h-1.6v-1.7h-1.7v-1.6h1.7z" className="fill-teal-600" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="leading-tight">
        <span className="block text-base font-bold tracking-tight text-brand-900 sm:text-lg">{compact ? site.shortName : site.name}</span>
      </span>
    </span>
  );
}
