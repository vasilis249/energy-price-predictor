import { z } from "zod";
import { optionalText, requiredText } from "./form";

// Keep in sync with supabase/config.toml [auth] minimum_password_length / password_requirements.
export const MIN_PASSWORD_LENGTH = 10;

const email = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
  z.string({ error: "required" }).min(1, "required").pipe(z.email("invalidEmail")),
);

const newPassword = z
  .string({ error: "required" })
  .min(MIN_PASSWORD_LENGTH, "passwordTooShort")
  .max(72, "tooLong")
  .refine((p) => /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p), "passwordTooWeak");

export const loginSchema = z.object({
  email,
  password: z.string({ error: "required" }).min(1, "required"),
});

export const signupSchema = z.object({
  fullName: requiredText(120),
  orgName: optionalText(120),
  email,
  password: newPassword,
  acceptTerms: z.literal("on", { error: "mustAcceptTerms" }),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: newPassword, confirmPassword: z.string({ error: "required" }) })
  .refine((v) => v.password === v.confirmPassword, { message: "passwordsDontMatch", path: ["confirmPassword"] });

/** Only allow same-site relative redirects after login (prevents open redirects). */
export function safeNextPath(next: unknown, fallback = "/dashboard"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }
  return next;
}
