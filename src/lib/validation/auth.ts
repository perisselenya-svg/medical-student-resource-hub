import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address")),
  // bcrypt only uses the first 72 bytes; the cap also bounds hashing cost.
  password: z.string().min(1, "Password is required").max(200, "Password is too long"),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Client-side login form (same rules, no transforms so React Hook Form types line up). */
export const loginFormSchema = z.object({
  email: z.string().trim().min(1, "Email is required").max(254).email("Enter a valid email address"),
  password: z.string().min(1, "Password is required").max(200, "Password is too long"),
});
export type LoginFormValues = z.infer<typeof loginFormSchema>;

/** Policy for admin passwords set via the seed or the admin:create script. */
export const newPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(72, "Password must be at most 72 characters")
  .refine((p) => /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p), { message: "Password must contain lowercase, uppercase and a digit" });
