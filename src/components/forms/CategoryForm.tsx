"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Save } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { ClientApiError } from "@/lib/http/client-api";
import { categoryFormSchema, type CategoryFormValues } from "@/lib/validation/taxonomy";

type Props = {
  initial?: CategoryFormValues;
  onSubmit: (values: CategoryFormValues) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
};

/** Create/edit form for a category (name, description, display order). */
export function CategoryForm({ initial, onSubmit, onCancel, submitLabel }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, reset, setError, formState } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: initial ?? { name: "", description: "", displayOrder: 0 },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await onSubmit(values);
      if (!initial) reset({ name: "", description: "", displayOrder: values.displayOrder + 10 });
    } catch (e) {
      if (e instanceof ClientApiError && e.fieldErrors.name) setError("name", { message: e.fieldErrors.name[0] });
      setServerError(e instanceof ClientApiError ? e.message : "Request failed");
    }
  });

  return (
    <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-[1fr_2fr_6rem_auto] sm:items-start">
      <Field label="Name" error={formState.errors.name?.message} required>
        {(a) => <Input {...a} {...register("name")} maxLength={80} />}
      </Field>
      <Field label="Description" error={formState.errors.description?.message}>
        {(a) => <Input {...a} {...register("description")} maxLength={500} />}
      </Field>
      <Field label="Order" error={formState.errors.displayOrder?.message}>
        {(a) => <Input {...a} {...register("displayOrder", { valueAsNumber: true })} type="number" min={0} max={10000} />}
      </Field>
      <div className="flex gap-2 sm:pt-6">
        <Button type="submit" loading={formState.isSubmitting} icon={initial ? <Save className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      {serverError && <Alert tone="error" className="sm:col-span-4">{serverError}</Alert>}
    </form>
  );
}
