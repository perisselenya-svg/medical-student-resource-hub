import { GallerySkeleton, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Skeleton className="mb-4 h-4 w-40" />
      <Skeleton className="mb-6 h-9 w-64" />
      <div className="grid items-start gap-6 lg:grid-cols-[17rem_1fr]">
        <Skeleton className="h-11 lg:h-96" />
        <div>
          <Skeleton className="mb-5 h-12" />
          <GallerySkeleton />
        </div>
      </div>
    </div>
  );
}
