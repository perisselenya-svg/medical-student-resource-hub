import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Eye, ShieldAlert } from "lucide-react";
import { DownloadButton } from "@/components/student/DownloadButton";
import { ImageViewer } from "@/components/student/ImageViewer";
import { MarkdownViewer } from "@/components/student/MarkdownViewer";
import { PdfViewer } from "@/components/student/PdfViewer";
import { ResourceGallery } from "@/components/student/ResourceGallery";
import { ViewTracker } from "@/components/student/ViewTracker";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { FileTypeIcon } from "@/components/ui/file-type-icon";
import { jsonLd, pageMetadata } from "@/lib/seo/metadata";
import { absoluteUrl, site } from "@/lib/seo/site";
import { getPublishedMaterialBySlug, readPublishedMarkdown, relatedMaterials } from "@/lib/services/material.service";
import { formatBytes, formatDate, imageAltText } from "@/lib/utils";
import { slugSchema } from "@/lib/validation/common";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const parsed = slugSchema.safeParse(slug);
  return parsed.success ? getPublishedMaterialBySlug(parsed.data) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = await load((await params).slug);
  if (!m) return { title: "Resource not found", robots: { index: false } };
  return pageMetadata({
    title: m.title,
    description: m.description.slice(0, 160) || `${m.category.name} resource for medical students.`,
    path: `/materials/${m.slug}`,
    type: "article",
    extraOpenGraph: { publishedTime: m.publishedAt ?? m.createdAt, modifiedTime: m.updatedAt, section: m.category.name, tags: m.tags.map((t) => t.name) },
  });
}

export default async function MaterialPage({ params }: Props) {
  const material = await load((await params).slug);
  if (!material) notFound(); // drafts and unknown slugs are indistinguishable to students

  const [markdown, related] = await Promise.all([
    material.fileType === "MARKDOWN" ? readPublishedMarkdown(material.id) : null,
    relatedMaterials(material, 3),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <ViewTracker materialId={material.id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "LearningResource",
            name: material.title,
            description: material.description || undefined,
            url: absoluteUrl(`/materials/${material.slug}`),
            datePublished: material.publishedAt ?? material.createdAt,
            dateModified: material.updatedAt,
            encodingFormat: material.mimeType,
            educationalLevel: "Medical school",
            learningResourceType: material.fileType === "IMAGE" ? "Diagram" : "Lecture notes",
            about: material.category.name,
            keywords: material.tags.map((t) => t.name).join(", ") || undefined,
            isAccessibleForFree: true,
            publisher: { "@type": "Organization", name: site.name },
          }),
        }}
      />
      <Breadcrumbs
        items={[
          { label: "Library", href: "/library" },
          { label: material.category.name, href: `/subjects/${material.category.slug}` },
          { label: material.title },
        ]}
      />

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/subjects/${material.category.slug}`} className="rounded-full">
            <Badge tone="brand">{material.category.name}</Badge>
          </Link>
          <FileTypeIcon mimeType={material.mimeType} />
        </div>
        <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">{material.title}</h1>
        {material.tags.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Tags">
            {material.tags.map((tag) => (
              <li key={tag.id}>
                <Link href={`/library?tag=${tag.slug}`} className="rounded-full">
                  <Badge>#{tag.name}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
          <div className="flex gap-1">
            <dt>Uploaded</dt>
            <dd className="font-medium text-slate-800">
              <time dateTime={material.createdAt}>{formatDate(material.createdAt)}</time>
            </dd>
          </div>
          <div className="flex gap-1">
            <dt>Updated</dt>
            <dd className="font-medium text-slate-800">
              <time dateTime={material.updatedAt}>{formatDate(material.updatedAt)}</time>
            </dd>
          </div>
          <div className="flex items-center gap-1">
            <dt>
              <Eye className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Views</span>
            </dt>
            <dd className="font-medium text-slate-800">{material.viewCount.toLocaleString("en-US")} view{material.viewCount === 1 ? "" : "s"}</dd>
          </div>
          <div className="flex items-center gap-1">
            <dt>
              <Download className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Downloads</span>
            </dt>
            <dd className="font-medium text-slate-800">{material.downloadCount.toLocaleString("en-US")} download{material.downloadCount === 1 ? "" : "s"}</dd>
          </div>
        </dl>
        <div className="mt-5">
          <DownloadButton materialId={material.id} href={material.fileUrl} label={`Download (${formatBytes(material.fileSize)})`} variant="primary" />
        </div>
      </header>

      {/* Embedded viewer, chosen by file type */}
      <section aria-label="Resource preview" className="mb-8">
        {material.fileType === "PDF" && (
          <div className="card h-[80dvh] min-h-[28rem] overflow-hidden">
            <PdfViewer url={material.fileUrl} title={material.title} downloadUrl={`${material.fileUrl}&download=1`} />
          </div>
        )}
        {material.fileType === "IMAGE" && <ImageViewer src={material.fileUrl} alt={imageAltText(material.title, material.description)} className="h-[75dvh] min-h-80" />}
        {material.fileType === "MARKDOWN" && markdown && (
          <article className="card p-5 sm:p-8">
            <MarkdownViewer source={markdown.text} />
            {markdown.truncated && <p className="mt-6 text-sm text-slate-600">This preview is truncated — download the file for the full notes.</p>}
          </article>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section aria-labelledby="about-heading" className="card p-5 sm:p-6">
          <h2 id="about-heading" className="text-lg font-semibold text-ink">
            About this resource
          </h2>
          {material.description ? (
            <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-700">{material.description}</p>
          ) : (
            <p className="mt-2 text-slate-600">No description provided.</p>
          )}
        </section>
        <aside className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            <strong className="font-semibold">{site.disclaimer}</strong> Verify clinical information against current guidelines and your supervising
            clinicians.
          </p>
        </aside>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-12">
          <h2 id="related-heading" className="mb-5 text-2xl font-bold tracking-tight text-ink">
            Related resources
          </h2>
          <ResourceGallery materials={related} />
        </section>
      )}
    </div>
  );
}
