import "server-only";
import type { AuditAction, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export type AuditEntry = {
  adminId: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Append-only audit trail of admin actions. A failure to write the audit row
 * is logged loudly but does not undo the (already completed) action.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await db().auditLog.create({
      data: {
        adminId: entry.adminId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata,
      },
    });
  } catch (error) {
    console.error("[audit] failed to record audit entry", entry.action, error);
  }
}

export async function recentAuditLogs(limit = 10) {
  return db().auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { admin: { select: { email: true } } },
  });
}
