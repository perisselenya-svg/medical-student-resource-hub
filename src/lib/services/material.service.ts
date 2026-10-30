import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { generateStorageKey, storage } from "@/lib/files/storage";
import { FILE_TYPE_ENUM } from "@/lib/files/types";
import type { ValidatedFile } from "@/lib/files/validation";
import { ApiError } from "@/lib/http/api";
import { slugify } from "@/lib/utils";
import type { AdminSessionUser, MaterialDTO, Paginated } from "@/types";
import type { MaterialQuery, MaterialUpdateInput, MaterialUploadInput } from "@/lib/validation/material";
import { recordAudit } from "./audit.service";
import { uniqueSlug } from "./slug";

const materialInclude = {
  category: { select: { id: true, name: true, slug: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } }, orderBy: { tag: { name: "asc" } } },
} satisfies Prisma.MaterialInclude;

type MaterialWithRelations = Prisma.MaterialGetPayload<{ include: typeof materialInclude }>;

export function toMaterialDTO(m: MaterialWithRelations): MaterialDTO {
  return {
    id: m.id,
    title: m.title,
    slug: m.slug,
    description: m.description,
    originalFileName: m.originalFileName,
    fileType: m.fileType,
    mimeType: m.mimeType,
    fileSize: m.fileSize,
    isPublished: m.isPublished,
    isFeatured: m.isFeatured,
    viewCount: m.viewCount,
    downloadCount: m.downloadCount,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    publishedAt: m.publishedAt?.toISOString() ?? null,
    category: m.category,
    tags: m.tags.map((t) => t.tag),
    // Version parameter changes after edits/re-uploads, so browsers never show a stale file.
    fileUrl: `${m.fileUrl}?v=${m.updatedAt.getTime().toString(36)}`,
  };
}

const SINCE_DAYS = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 } as const;

/**
 * WHERE clause for listing/searching.
 * SECURITY: `publishedOnly` comes from the calling context (public route vs.
 * authenticated admin route) — never from a query parameter.
 */
function buildWhere(query: MaterialQuery, publishedOnly: boolean): Prisma.MaterialWhereInput {
  const and: Prisma.MaterialWhereInput[] = [];
  if (publishedOnly) and.push({ isPublished: true });
  else if (query.status) and.push({ isPublished: query.status === "published" });
  if (query.featured) and.push({ isFeatured: true });

  if (query.q) {
    // Every word must match somewhere (title, description, category or tag).
    for (const term of query.q.split(/\s+/).filter(Boolean).slice(0, 8)) {
      const contains = { contains: term, mode: "insensitive" as const };
      and.push({
        OR: [
          { title: contains },
          { description: contains },
          { category: { name: contains } },
          { tags: { some: { tag: { name: contains } } } },
        ],
      });
    }
  }
  if (query.category) and.push({ category: { slug: query.category } });
  // Tag filter is AND: each selected tag must be present.
  for (const tag of query.tag) and.push({ tags: { some: { tag: { slug: tag } } } });
  if (query.type.length > 0) and.push({ fileType: { in: query.type.map((k) => FILE_TYPE_ENUM[k]) } });
  if (query.since) and.push({ createdAt: { gte: new Date(Date.now() - SINCE_DAYS[query.since] * 86_400_000) } });
  return { AND: and };
}

function buildOrderBy(sort: MaterialQuery["sort"]): Prisma.MaterialOrderByWithRelationInput[] {
  switch (sort) {
    case "views":
      return [{ viewCount: "desc" }, { createdAt: "desc" }];
    case "downloads":
      return [{ downloadCount: "desc" }, { createdAt: "desc" }];
    case "title":
      return [{ title: "asc" }, { id: "asc" }];
    case "newest":
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}

export async function listMaterials(query: MaterialQuery, { publishedOnly }: { publishedOnly: boolean }): Promise<Paginated<MaterialDTO>> {
  const where = buildWhere(query, publishedOnly);
  const [rows, total] = await db().$transaction([
    db().material.findMany({
      where,
      include: materialInclude,
      orderBy: buildOrderBy(query.sort),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    db().material.count({ where }),
  ]);
  return { items: rows.map(toMaterialDTO), total, page: query.page, pageSize: query.pageSize, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) };
}

export async function getPublishedMaterialBySlug(slug: string): Promise<MaterialDTO | null> {
  const m = await db().material.findFirst({ where: { slug, isPublished: true }, include: materialInclude });
  return m ? toMaterialDTO(m) : null;
}

export async function getMaterialById(id: string): Promise<MaterialDTO | null> {
  const m = await db().material.findUnique({ where: { id }, include: materialInclude });
  return m ? toMaterialDTO(m) : null;
}

/** Internal lookup for the file route (includes the private storage key). */
export async function getMaterialFileRecord(id: string) {
  return db().material.findUnique({
    where: { id },
    select: { id: true, isPublished: true, storedFileName: true, mimeType: true, fileType: true, originalFileName: true, updatedAt: true },
  });
}

type HomeSection = "featured" | "popular" | "latest";

export async function homeMaterials(section: HomeSection, limit: number): Promise<MaterialDTO[]> {
  const orderBy: Record<HomeSection, Prisma.MaterialOrderByWithRelationInput[]> = {
    featured: [{ updatedAt: "desc" }],
    popular: [{ viewCount: "desc" }, { downloadCount: "desc" }],
    latest: [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  };
  const where: Prisma.MaterialWhereInput = {
    isPublished: true,
    ...(section === "featured" ? { isFeatured: true } : {}),
    ...(section === "popular" ? { viewCount: { gt: 0 } } : {}),
  };
  const rows = await db().material.findMany({ where, include: materialInclude, orderBy: orderBy[section], take: limit });
  return rows.map(toMaterialDTO);
}

export async function relatedMaterials(material: MaterialDTO, limit: number): Promise<MaterialDTO[]> {
  const tagIds = material.tags.map((t) => t.id);
  const rows = await db().material.findMany({
    where: {
      isPublished: true,
      id: { not: material.id },
      OR: [{ categoryId: material.category.id }, ...(tagIds.length ? [{ tags: { some: { tagId: { in: tagIds } } } }] : [])],
    },
    include: materialInclude,
    orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
  return rows.map(toMaterialDTO);
}

export async function libraryLastUpdated(): Promise<Date | null> {
  const r = await db().material.aggregate({ where: { isPublished: true }, _max: { updatedAt: true } });
  return r._max.updatedAt;
}

export async function publishedSlugs() {
  return db().material.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } });
}

/**
 * Increment a public counter for a PUBLISHED material only. Returns false if
 * the material is missing or unpublished (the route answers 404).
 */
export async function incrementCounter(id: string, counter: "viewCount" | "downloadCount"): Promise<boolean> {
  const result = await db().material.updateMany({ where: { id, isPublished: true }, data: { [counter]: { increment: 1 } } });
  return result.count === 1;
}

/** Plain text of a PUBLISHED Markdown material (rendered safely by the page). */
export async function readPublishedMarkdown(id: string, maxBytes = 512 * 1024) {
  const record = await getMaterialFileRecord(id);
  if (!record || !record.isPublished || record.fileType !== "MARKDOWN") return null;
  const info = await storage().stat(record.storedFileName);
  if (!info) return null;
  const stream = await storage().getStream(record.storedFileName, { start: 0, end: Math.min(info.size, maxBytes) - 1 });
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return { text: new TextDecoder("utf-8").decode(bytes), truncated: info.size > maxBytes };
}

/* ------------------------------ Mutations ------------------------------ */

async function assertCategoryAndTags(categoryId: string | undefined, tagIds: string[] | undefined) {
  if (categoryId !== undefined && !(await db().category.findUnique({ where: { id: categoryId }, select: { id: true } }))) {
    throw new ApiError("VALIDATION_ERROR", "Selected category does not exist", { fieldErrors: { categoryId: ["Unknown category"] } });
  }
  if (tagIds && tagIds.length > 0) {
    const unique = [...new Set(tagIds)];
    if ((await db().tag.count({ where: { id: { in: unique } } })) !== unique.length) {
      throw new ApiError("VALIDATION_ERROR", "One or more tags do not exist", { fieldErrors: { tagIds: ["Unknown tag"] } });
    }
  }
}

async function materialSlugTaken(slug: string, exceptId?: string) {
  const found = await db().material.findUnique({ where: { slug }, select: { id: true } });
  return Boolean(found && found.id !== exceptId);
}

/**
 * Create: store the file under a fresh random key first, then insert the
 * row. If the insert fails the stored file is removed, so no orphan remains.
 */
export async function createMaterial(input: MaterialUploadInput, file: ValidatedFile, admin: AdminSessionUser) {
  await assertCategoryAndTags(input.categoryId, input.tagIds);
  if (input.slug && (await materialSlugTaken(input.slug))) {
    throw new ApiError("CONFLICT", "That slug is already used by another material", { fieldErrors: { slug: ["Slug already in use"] } });
  }
  const slug = input.slug ?? (await uniqueSlug(slugify(input.title) || "material", (s) => materialSlugTaken(s)));
  const id = randomUUID();
  const key = generateStorageKey(file.ext);
  await storage().put(key, file.buffer);

  try {
    const material = await db().material.create({
      data: {
        id,
        title: input.title,
        slug,
        description: input.description,
        fileUrl: `/api/files/${id}`,
        storedFileName: key,
        originalFileName: file.originalFilename,
        fileType: file.fileType,
        mimeType: file.mimeType,
        fileSize: file.size,
        isPublished: input.isPublished,
        isFeatured: input.isFeatured,
        publishedAt: input.isPublished ? new Date() : null,
        categoryId: input.categoryId,
        uploadedById: admin.id,
        tags: { create: [...new Set(input.tagIds)].map((tagId) => ({ tagId })) },
      },
      include: materialInclude,
    });
    await recordAudit({
      adminId: admin.id,
      action: "MATERIAL_CREATE",
      entityType: "Material",
      entityId: id,
      metadata: { title: material.title, isPublished: material.isPublished, mimeType: material.mimeType, size: material.fileSize },
    });
    return toMaterialDTO(material);
  } catch (error) {
    await storage().delete(key).catch((e) => console.error("[materials] cleanup after failed create", key, e));
    throw error;
  }
}

export async function updateMaterial(id: string, input: MaterialUpdateInput, admin: AdminSessionUser) {
  const current = await db().material.findUnique({ where: { id }, select: { publishedAt: true } });
  if (!current) throw new ApiError("NOT_FOUND", "Material not found");
  await assertCategoryAndTags(input.categoryId, input.tagIds);
  if (input.slug && (await materialSlugTaken(input.slug, id))) {
    throw new ApiError("CONFLICT", "That slug is already used by another material", { fieldErrors: { slug: ["Slug already in use"] } });
  }

  const data: Prisma.MaterialUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.slug !== undefined) data.slug = input.slug;
  if (input.description !== undefined) data.description = input.description;
  if (input.categoryId !== undefined) data.category = { connect: { id: input.categoryId } };
  if (input.isFeatured !== undefined) data.isFeatured = input.isFeatured;
  if (input.isPublished !== undefined) {
    data.isPublished = input.isPublished;
    if (input.isPublished && !current.publishedAt) data.publishedAt = new Date();
  }

  const material = await db().$transaction(async (tx) => {
    if (input.tagIds !== undefined) {
      await tx.materialTag.deleteMany({ where: { materialId: id } });
      if (input.tagIds.length > 0) {
        await tx.materialTag.createMany({ data: [...new Set(input.tagIds)].map((tagId) => ({ materialId: id, tagId })) });
      }
    }
    return tx.material.update({ where: { id }, data, include: materialInclude });
  });

  await recordAudit({ adminId: admin.id, action: "MATERIAL_UPDATE", entityType: "Material", entityId: id, metadata: { title: material.title, changes: input } });
  return toMaterialDTO(material);
}

/**
 * Re-upload. Safe ordering: write the NEW file under a new key, point the row
 * at it, and only then delete the OLD file. A failure in between removes the
 * new file and leaves the material working.
 */
export async function replaceMaterialFile(id: string, file: ValidatedFile, admin: AdminSessionUser) {
  const current = await db().material.findUnique({ where: { id }, select: { storedFileName: true } });
  if (!current) throw new ApiError("NOT_FOUND", "Material not found");

  const key = generateStorageKey(file.ext);
  await storage().put(key, file.buffer);
  let material: MaterialWithRelations;
  try {
    material = await db().material.update({
      where: { id },
      data: { storedFileName: key, originalFileName: file.originalFilename, fileType: file.fileType, mimeType: file.mimeType, fileSize: file.size },
      include: materialInclude,
    });
  } catch (error) {
    await storage().delete(key).catch(() => undefined);
    throw error;
  }
  await storage()
    .delete(current.storedFileName)
    .catch((e) => console.error("[materials] failed to delete replaced file (orphan; run npm run storage:cleanup)", current.storedFileName, e));
  await recordAudit({
    adminId: admin.id,
    action: "MATERIAL_REPLACE_FILE",
    entityType: "Material",
    entityId: id,
    metadata: { title: material.title, originalFileName: file.originalFilename, mimeType: file.mimeType, size: file.size },
  });
  return toMaterialDTO(material);
}

/**
 * Delete the row first (instantly revoking access, since files are only
 * served for existing rows), then the physical file. A failed file delete is
 * logged; the orphan is unreachable and removed by `npm run storage:cleanup`.
 */
export async function deleteMaterial(id: string, admin: AdminSessionUser): Promise<void> {
  const material = await db().material.delete({ where: { id }, select: { title: true, storedFileName: true } });
  await storage()
    .delete(material.storedFileName)
    .catch((e) => console.error("[materials] failed to delete file (orphan; run npm run storage:cleanup)", material.storedFileName, e));
  await recordAudit({ adminId: admin.id, action: "MATERIAL_DELETE", entityType: "Material", entityId: id, metadata: { title: material.title } });
}
