"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import type { ActionState } from "@/lib/action-state";
import { formDataToObject, toFieldErrors } from "@/lib/validation/form";
import { siteSchema } from "@/lib/validation/site";
import { getCurrentOrg } from "@/server/auth";
import { createSite, deleteSite, updateSite } from "@/server/sites";

const siteId = z.uuid();

export async function saveSiteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const org = await getCurrentOrg();
  if (!org) return { status: "error", formError: "auth.errors.sessionExpired" };

  const values = formDataToObject(formData);
  const id = values.id ? siteId.safeParse(values.id) : null;
  if (id && !id.success) return { status: "error", formError: "auth.errors.generic" };

  const parsed = siteSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error) };

  try {
    if (id) {
      if (!(await updateSite(id.data, parsed.data))) return { status: "error", formError: "auth.errors.generic" };
    } else {
      await createSite(org.id, parsed.data);
    }
  } catch (error) {
    console.error("saving site failed", error);
    return { status: "error", formError: "auth.errors.generic" };
  }
  revalidatePath("/[locale]", "layout");
  return redirect({
    href: { pathname: "/sites", query: { notice: id ? "updated" : "created" } },
    locale: await getLocale(),
  });
}

export async function deleteSiteAction(formData: FormData): Promise<void> {
  const locale = await getLocale();
  const id = siteId.safeParse(formData.get("id"));
  if (id.success) {
    try {
      await deleteSite(id.data);
    } catch (error) {
      // Listings reference their site (on delete restrict).
      if ((error as { code?: string }).code === "23503") {
        return redirect({ href: { pathname: "/sites", query: { notice: "inUse" } }, locale });
      }
      throw error;
    }
    revalidatePath("/[locale]", "layout");
  }
  return redirect({ href: { pathname: "/sites", query: { notice: "deleted" } }, locale });
}
