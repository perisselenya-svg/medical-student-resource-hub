import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site";
import { publishedSlugs } from "@/lib/services/material.service";
import { publishedQuizSlugs } from "@/lib/services/quiz.service";
import { listCategories } from "@/lib/services/taxonomy.service";

export const dynamic = "force-dynamic";

/** Only PUBLISHED materials/quizzes and subjects with published content are listed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [materials, quizzes, categories] = await Promise.all([publishedSlugs(), publishedQuizSlugs(), listCategories({ publishedOnly: true })]);
  const latest = materials.reduce<Date | undefined>((max, m) => (!max || m.updatedAt > max ? m.updatedAt : max), undefined);
  return [
    { url: absoluteUrl("/"), lastModified: latest, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/library"), lastModified: latest, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/subjects"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/quizzes"), changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/disclaimer"), changeFrequency: "yearly", priority: 0.2 },
    ...categories
      .filter((c) => c.materialCount > 0)
      .map((c) => ({ url: absoluteUrl(`/subjects/${c.slug}`), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...materials.map((m) => ({ url: absoluteUrl(`/materials/${m.slug}`), lastModified: m.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...quizzes.map((q) => ({ url: absoluteUrl(`/quizzes/${q.slug}`), lastModified: q.updatedAt, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
