import { requireAdmin } from "@/lib/auth/guard";
import { env } from "@/lib/env";
import { validateUpload } from "@/lib/files/validation";
import { handle, ok, parseOrThrow } from "@/lib/http/api";
import { readUploadForm, requireFile } from "@/lib/http/upload";
import { replaceMaterialFile } from "@/lib/services/material.service";
import { idSchema } from "@/lib/validation/common";

type Context = { params: Promise<{ id: string }> };

/** PUT /api/admin/materials/:id/file (multipart "file") — re-upload; same validation as uploads. */
export const PUT = handle<Context>(async (request, { params }) => {
  const admin = await requireAdmin(request);
  const id = parseOrThrow(idSchema, (await params).id);
  const form = await readUploadForm(request, admin);
  const file = await validateUpload(requireFile(form), env().maxUploadBytes);
  return ok(await replaceMaterialFile(id, file, admin));
});
