import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200", className)} aria-hidden="true" />;
}

export function MaterialCardSkeleton() {
  return (
    <div className="card overflow-hidden" aria-hidden="true">
      <Skeleton className="h-28 rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
}

export function GallerySkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading resources…</span>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <MaterialCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
