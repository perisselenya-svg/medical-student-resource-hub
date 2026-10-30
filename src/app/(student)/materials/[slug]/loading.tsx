import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6" role="status">
      <span className="sr-only">Loading resource…</span>
      <Skeleton className="mb-4 h-4 w-56" />
      <Skeleton className="h-6 w-24" />
      <Skeleton className="mt-3 h-10 w-3/4" />
      <Skeleton className="mt-4 h-4 w-1/2" />
      <Skeleton className="mt-5 h-10 w-40" />
      <Skeleton className="mt-6 h-[60dvh]" />
    </div>
  );
}
