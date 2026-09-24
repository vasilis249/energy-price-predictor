"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import type { ActionState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";
import { formDataToObject, toFieldErrors } from "@/lib/validation/form";
import { organizationProfileSchema } from "@/lib/validation/organization";
import { profileSchema } from "@/lib/validation/settings";
import { getCurrentOrg, getSessionUser } from "@/server/auth";
import { persistLocale } from "@/server/locale";

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user) return { status: "error", formError: "auth.errors.sessionExpired" };
  const parsed = profileSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, locale: parsed.data.locale })
    .eq("id", user.id);
  if (error) {
    console.error("profile update failed", error);
    return { status: "error", formError: "auth.errors.generic" };
  }
  // Keep auth metadata in sync so email templates use the chosen language.
  await supabase.auth.updateUser({ data: { locale: parsed.data.locale, full_name: parsed.data.fullName } });

  revalidatePath("/[locale]/(app)", "layout");
  // Show settings (and everything after) in the newly chosen language.
  await persistLocale(parsed.data.locale);
  return redirect({ href: { pathname: "/settings", query: { saved: "1" } }, locale: parsed.data.locale });
}

export async function updateOrganization(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const org = await getCurrentOrg();
  if (!org) return { status: "error", formError: "auth.errors.sessionExpired" };
  if (org.role !== "owner") return { status: "error", formError: "settings.orgOwnerOnly" };
  const parsed = organizationProfileSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error) };

  const { orgName, legalName, vatNumber, phone } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ name: orgName, legal_name: legalName, vat_number: vatNumber, phone })
    .eq("id", org.id);
  if (error?.code === "23505") return { status: "error", formError: "onboarding.roleTaken" };
  if (error) {
    console.error("organization update failed", error);
    return { status: "error", formError: "auth.errors.generic" };
  }
  revalidatePath("/[locale]/(app)", "layout");
  return { status: "success", message: "common.saved" };
}
