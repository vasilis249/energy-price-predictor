"use server";

import type { AuthError } from "@supabase/supabase-js";
import { getLocale } from "next-intl/server";
import { redirect as redirectExternal } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { ActionState } from "@/lib/action-state";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { persistLocale } from "@/server/locale";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  safeNextPath,
  signupSchema,
} from "@/lib/validation/auth";
import { formDataToObject, toFieldErrors } from "@/lib/validation/form";

function authErrorKey(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "auth.errors.invalidCredentials";
    case "email_not_confirmed":
      return "auth.errors.emailNotConfirmed";
    case "user_already_exists":
    case "email_exists":
      return "auth.errors.userExists";
    case "weak_password":
      return "auth.errors.weakPassword";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "auth.errors.rateLimited";
    case "session_not_found":
    case "session_expired":
      return "auth.errors.sessionExpired";
    default:
      if (error.status === 429) return "auth.errors.rateLimited";
      console.error("Unhandled auth error", error.code, error.message);
      return "auth.errors.generic";
  }
}

function callbackUrl(locale: Locale, next?: string) {
  const url = new URL("/auth/callback", publicEnv.NEXT_PUBLIC_SITE_URL);
  url.searchParams.set("locale", locale);
  if (next) url.searchParams.set("next", next);
  return url.toString();
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formDataToObject(formData);
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", formError: authErrorKey(error) };

  // Continue in the language the user chose at signup / in settings.
  const { data: profile } = await supabase.from("profiles").select("locale").eq("id", data.user.id).maybeSingle();
  const locale = profile?.locale ?? (await getLocale());
  await persistLocale(locale);
  return redirect({ href: safeNextPath(values.next), locale });
}

export async function signup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error) };

  const locale = await getLocale();
  const { email, password, fullName, orgName } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, org_name: orgName ?? "", locale },
      emailRedirectTo: callbackUrl(locale),
    },
  });
  if (error) return { status: "error", formError: authErrorKey(error) };

  // Supabase deliberately returns success for already-registered emails (no account enumeration),
  // so every successful call lands on the same "check your email" page.
  return redirect({ href: "/check-email", locale });
}

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error) };

  const locale = await getLocale();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl(locale, "/reset-password"),
  });
  if (error && error.status === 429) return { status: "error", formError: "auth.errors.rateLimited" };
  if (error) console.error("resetPasswordForEmail failed", error.code, error.message);
  // Same response whether or not the account exists.
  return { status: "success", message: "auth.forgot.sent" };
}

export async function resetPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) return { status: "error", formError: "auth.errors.sessionExpired" };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", formError: authErrorKey(error) };
  return redirect({ href: "/dashboard", locale: await getLocale() });
}

export async function signInWithGoogle(): Promise<void> {
  const locale = await getLocale();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl(locale) },
  });
  if (error || !data.url) {
    return redirect({ href: { pathname: "/login", query: { error: "generic" } }, locale });
  }
  // Google's consent screen: an external URL, so bypass locale prefixing.
  redirectExternal(data.url);
}
