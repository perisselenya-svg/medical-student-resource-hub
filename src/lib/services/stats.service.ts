import "server-only";
import { db } from "@/lib/db";
import { storage } from "@/lib/files/storage";
import { recentAuditLogs } from "./audit.service";
import { toMaterialDTO } from "./material.service";

/** Everything the admin dashboard shows (also served by GET /api/admin/dashboard). */
export async function dashboardStats() {
  const [byStatus, sums, recent, activity, disk, categoryCount, tagCount, quizCount] = await Promise.all([
    db().material.groupBy({ by: ["isPublished"], _count: { _all: true } }),
    db().material.aggregate({ _sum: { fileSize: true, viewCount: true, downloadCount: true } }),
    db().material.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      },
    }),
    recentAuditLogs(10),
    storage().usage(),
    db().category.count(),
    db().tag.count(),
    db().quiz.count(),
  ]);

  const published = byStatus.find((s) => s.isPublished)?._count._all ?? 0;
  const drafts = byStatus.find((s) => !s.isPublished)?._count._all ?? 0;

  return {
    totals: {
      materials: published + drafts,
      published,
      drafts,
      categories: categoryCount,
      tags: tagCount,
      quizzes: quizCount,
      views: sums._sum.viewCount ?? 0,
      downloads: sums._sum.downloadCount ?? 0,
      storageBytes: sums._sum.fileSize ?? 0,
    },
    disk,
    recentUploads: recent.map(toMaterialDTO),
    activity: activity.map((a) => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      adminEmail: a.admin?.email ?? null,
      metadata: a.metadata,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

export type DashboardStats = Awaited<ReturnType<typeof dashboardStats>>;
