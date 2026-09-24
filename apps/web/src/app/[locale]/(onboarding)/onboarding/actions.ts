"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import type { ActionState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";
import { formDataToObject, toFieldErrors } from "@/lib/validation/form";
import { onboardingSchema } from "@/lib/validation/organization";
import { getSessionUser } from "@/server/auth";

export async function completeOnboarding(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getSessionUser())) return { status: "error", formError: "auth.errors.sessionExpired" };
  const parsed = onboardingSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error) };

  const { marketRole, legalName, vatNumber, phone } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_onboarding", {
    p_role: marketRole,
    p_legal_name: legalName,
    p_vat_number: vatNumber,
    p_phone: phone,
  });
  if (error) {
    if (error.code === "23505") return { status: "error", formError: "onboarding.roleTaken" };
    console.error("complete_onboarding failed", error);
    return { status: "error", formError: "auth.errors.generic" };
  }
  revalidatePath("/[locale]", "layout");
  return redirect({ href: "/dashboard", locale: await getLocale() });
}
