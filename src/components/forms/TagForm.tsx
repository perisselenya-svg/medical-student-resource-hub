"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Save } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { ClientApiError } from "@/lib/http/client-api";
import { tagCreateSchema, type TagFormValues } from "@/lib/validation/taxonomy";

type Props = { initial?: TagFormValues; onSubmit: (values: TagFormValues) => Promise<void>; onCancel?: () => void; submitLabel: string };

export function TagForm({ initial, onSubmit, onCancel, submitLabel }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, reset, setError, formState } = useForm<TagFormValues>({
    resolver: zodResolver(tagCreateSchema),
    defaultValues: initial ?? { name: "" },
  });
  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await onSubmit(values);
      if (!initial) reset({ name: "" });
    } catch (e) {
      if (e instanceof ClientApiError && e.fieldErrors.name) setError("name", { message: e.fieldErrors.name[0] });
      setServerError(e instanceof ClientApiError ? e.message : "Request failed");
    }
  });
  return (
    <form onSubmit={submit} noValidate className="flex flex-wrap items-start gap-3">
      <Field label="Tag name" error={formState.errors.name?.message} required className="min-w-48 flex-1">
        {(a) => <Input {...a} {...register("name")} maxLength={50} />}
      </Field>
      <div className="flex gap-2 pt-6">
        <Button type="submit" loading={formState.isSubmitting} icon={initial ? <Save className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      {serverError && <Alert tone="error" className="w-full">{serverError}</Alert>}
    </form>
  );
}
