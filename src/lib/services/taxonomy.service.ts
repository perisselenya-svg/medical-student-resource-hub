import "server-only";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/http/api";
import { slugify } from "@/lib/utils";
import type { CategoryDTO, TagDTO } from "@/types";
import type { CategoryCreateInput, CategoryUpdateInput } from "@/lib/validation/taxonomy";
import { recordAudit } from "./audit.service";

/* ----------------------------- Categories ----------------------------- */

/**
 * @param publishedOnly true for student views: counts include only PUBLISHED
 * materials/quizzes so draft activity is never leaked through counts.
 */
export async function listCategories({ publishedOnly }: { publishedOnly: boolean }): Promise<CategoryDTO[]> {
  const where = publishedOnly ? { where: { isPublished: true } } : true;
  const rows = await db().category.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { materials: where, quizzes: where } } },
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    displayOrder: c.displayOrder,
    materialCount: c._count.materials,
    quizCount: c._count.quizzes,
  }));
}

export async function getCategoryBySlug(slug: string) {
  return db().category.findUnique({ where: { slug } });
}

async function assertCategoryNameFree(name: string, exceptId?: string) {
  const slug = slugify(name);
  const existing = await db().category.findFirst({
    where: { OR: [{ slug }, { name: { equals: name, mode: "insensitive" } }], ...(exceptId ? { NOT: { id: exceptId } } : {}) },
  });
  if (existing) throw new ApiError("CONFLICT", `Category "${existing.name}" already exists`, { fieldErrors: { name: ["Name already in use"] } });
  return slug;
}

export async function createCategory(input: CategoryCreateInput, adminId: string) {
  const slug = await assertCategoryNameFree(input.name);
  const category = await db().category.create({
    data: { name: input.name, slug, description: input.description || null, displayOrder: input.displayOrder },
  });
  await recordAudit({ adminId, action: "CATEGORY_CREATE", entityType: "Category", entityId: category.id, metadata: { name: category.name } });
  return category;
}

export async function updateCategory(id: string, input: CategoryUpdateInput, adminId: string) {
  const data: { name?: string; slug?: string; description?: string | null; displayOrder?: number } = {};
  if (input.name !== undefined) {
    data.name = input.name;
    data.slug = await assertCategoryNameFree(input.name, id); // slug follows the name
  }
  if (input.description !== undefined) data.description = input.description || null;
  if (input.displayOrder !== undefined) data.displayOrder = input.displayOrder;
  const category = await db().category.update({ where: { id }, data });
  await recordAudit({ adminId, action: "CATEGORY_UPDATE", entityType: "Category", entityId: id, metadata: { name: category.name, changes: input } });
  return category;
}

/**
 * Delete a category. An empty category is deleted directly. A category that
 * still has materials or quizzes is only deleted after explicit confirmation
 * in the form of a destination (`moveTo`): its content is moved there in the
 * same transaction, so nothing is ever orphaned or silently deleted.
 */
export async function deleteCategory(id: string, moveTo: string | undefined, adminId: string) {
  const category = await db().category.findUnique({ where: { id }, include: { _count: { select: { materials: true, quizzes: true } } } });
  if (!category) throw new ApiError("NOT_FOUND", "Category not found");
  const inUse = category._count.materials + category._count.quizzes;

  if (inUse > 0) {
    if (!moveTo) {
      throw new ApiError(
        "CONFLICT",
        `This category has ${category._count.materials} material(s) and ${category._count.quizzes} quiz(zes). Choose a category to move them to.`,
        { materialCount: category._count.materials, quizCount: category._count.quizzes },
      );
    }
    if (moveTo === id) throw new ApiError("VALIDATION_ERROR", "Choose a different destination category");
    if (!(await db().category.findUnique({ where: { id: moveTo }, select: { id: true } }))) {
      throw new ApiError("VALIDATION_ERROR", "Destination category does not exist");
    }
  }

  await db().$transaction(async (tx) => {
    if (inUse > 0 && moveTo) {
      await tx.material.updateMany({ where: { categoryId: id }, data: { categoryId: moveTo } });
      await tx.quiz.updateMany({ where: { categoryId: id }, data: { categoryId: moveTo } });
    }
    await tx.category.delete({ where: { id } });
  });
  await recordAudit({
    adminId,
    action: "CATEGORY_DELETE",
    entityType: "Category",
    entityId: id,
    metadata: { name: category.name, movedTo: moveTo ?? null, movedMaterials: category._count.materials, movedQuizzes: category._count.quizzes },
  });
}

/* -------------------------------- Tags -------------------------------- */

export async function listTags({ publishedOnly }: { publishedOnly: boolean }): Promise<TagDTO[]> {
  const rows = await db().tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { materials: publishedOnly ? { where: { material: { isPublished: true } } } : true } } },
  });
  return rows
    .map((t) => ({ id: t.id, name: t.name, slug: t.slug, materialCount: t._count.materials }))
    .filter((t) => !publishedOnly || t.materialCount > 0);
}

/** Idempotent create (used by inline tag creation): returns the existing tag for the same slug. */
export async function findOrCreateTag(name: string, adminId: string) {
  const slug = slugify(name, 60);
  const existing = await db().tag.findUnique({ where: { slug } });
  if (existing) return { tag: existing, created: false };
  try {
    const tag = await db().tag.create({ data: { name, slug } });
    await recordAudit({ adminId, action: "TAG_CREATE", entityType: "Tag", entityId: tag.id, metadata: { name } });
    return { tag, created: true };
  } catch (error) {
    // Concurrent creation of the same tag: return the winner.
    const winner = await db().tag.findFirst({ where: { OR: [{ slug }, { name }] } });
    if (winner) return { tag: winner, created: false };
    throw error;
  }
}

export async function updateTag(id: string, name: string, adminId: string) {
  const slug = slugify(name, 60);
  const clash = await db().tag.findFirst({ where: { OR: [{ slug }, { name: { equals: name, mode: "insensitive" } }], NOT: { id } } });
  if (clash) throw new ApiError("CONFLICT", `Tag "${clash.name}" already exists`, { fieldErrors: { name: ["Name already in use"] } });
  const tag = await db().tag.update({ where: { id }, data: { name, slug } });
  await recordAudit({ adminId, action: "TAG_UPDATE", entityType: "Tag", entityId: id, metadata: { name } });
  return tag;
}

/**
 * Delete a tag. If materials use it, explicit confirmation is required; the
 * tag is then removed from those materials (the materials themselves stay).
 */
export async function deleteTag(id: string, confirmed: boolean, adminId: string) {
  const tag = await db().tag.findUnique({ where: { id }, include: { _count: { select: { materials: true } } } });
  if (!tag) throw new ApiError("NOT_FOUND", "Tag not found");
  if (tag._count.materials > 0 && !confirmed) {
    throw new ApiError("CONFLICT", `This tag is used by ${tag._count.materials} material(s). Confirm to remove it from them and delete it.`, {
      materialCount: tag._count.materials,
    });
  }
  await db().tag.delete({ where: { id } }); // MaterialTag rows cascade
  await recordAudit({ adminId, action: "TAG_DELETE", entityType: "Tag", entityId: id, metadata: { name: tag.name, detachedFrom: tag._count.materials } });
}
