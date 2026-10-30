import Link from "next/link";
import { ArrowRight, Eye, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FileCover, FileTypeIcon } from "@/components/ui/file-type-icon";
import { formatDate } from "@/lib/utils";
import type { MaterialDTO } from "@/types";

type MaterialCardProps = {
  material: MaterialDTO;
  onQuickView?: (material: MaterialDTO) => void;
  headingLevel?: "h2" | "h3";
};

export function MaterialCard({ material, onQuickView, headingLevel: Heading = "h3" }: MaterialCardProps) {
  const href = `/materials/${material.slug}`;
  const previewable = material.fileType !== "MARKDOWN" && onQuickView;
  const visibleTags = material.tags.slice(0, 3);

  return (
    <article className="card group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="relative">
        <FileCover mimeType={material.mimeType} className="h-24 transition-opacity group-hover:opacity-90" />
        {material.isFeatured && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-amber-800">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" aria-hidden="true" /> Featured
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Link href={`/subjects/${material.category.slug}`} className="rounded-full">
            <Badge tone="brand">{material.category.name}</Badge>
          </Link>
          <FileTypeIcon mimeType={material.mimeType} />
        </div>
        <Heading className="text-lg font-semibold leading-snug text-ink">
          <Link href={href} className="hover:text-teal-800 hover:underline">
            {material.title}
          </Link>
        </Heading>
        {material.isFeatured && <span className="sr-only">Featured resource.</span>}
        {material.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{material.description}</p>}
        {visibleTags.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Tags">
            {visibleTags.map((tag) => (
              <li key={tag.id}>
                <Link href={`/library?tag=${tag.slug}`} className="rounded-full">
                  <Badge>#{tag.name}</Badge>
                </Link>
              </li>
            ))}
            {material.tags.length > visibleTags.length && (
              <li>
                <Badge>+{material.tags.length - visibleTags.length}</Badge>
              </li>
            )}
          </ul>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <p className="flex items-center gap-2 text-xs text-slate-600">
            <time dateTime={material.createdAt}>{formatDate(material.createdAt)}</time>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              {material.viewCount.toLocaleString("en-US")}
              <span className="sr-only">views</span>
            </span>
          </p>
          {previewable ? (
            <button type="button" className="btn-secondary btn-sm" aria-haspopup="dialog" aria-label={`Quick view: ${material.title}`} onClick={() => onQuickView(material)}>
              Quick view
            </button>
          ) : (
            <Link href={href} className="btn-secondary btn-sm" aria-label={`Read: ${material.title}`}>
              Read <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
