"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { apiFetch, ClientApiError } from "@/lib/http/client-api";
import { loginFormSchema, type LoginFormValues } from "@/lib/validation/auth";

/** Only same-site admin paths are accepted as post-login destinations (no open redirects). */
function safeNext(next: string | undefined): string {
  return next && next.startsWith("/admin/") && !next.startsWith("//") && !next.includes("\\") ? next : "/admin/dashboard";
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema), defaultValues: { email: "", password: "" } });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await apiFetch("/api/auth/login", { method: "POST", json: values });
      router.replace(safeNext(next));
      router.refresh();
    } catch (e) {
      setServerError(e instanceof ClientApiError ? e.message : "Sign-in failed. Please try again.");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {serverError && <Alert tone="error">{serverError}</Alert>}
      <Field label="Email" error={errors.email?.message} required>
        {(a) => <Input {...a} {...register("email")} type="email" autoComplete="username" autoFocus />}
      </Field>
      <Field label="Password" error={errors.password?.message} required>
        {(a) => <Input {...a} {...register("password")} type="password" autoComplete="current-password" />}
      </Field>
      <Button type="submit" className="w-full" loading={isSubmitting} icon={<LogIn className="h-4 w-4" aria-hidden="true" />}>
        Sign in
      </Button>
    </form>
  );
}
