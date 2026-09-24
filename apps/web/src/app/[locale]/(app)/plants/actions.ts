"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import type { ActionState } from "@/lib/action-state";
import { formDataToObject } from "@/lib/validation/form";
import { parsePlantForm } from "@/lib/validation/plant";
import { getCurrentOrg, getSessionUser } from "@/server/auth";
import { deletePlant, savePlant } from "@/server/plants";

const plantId = z.uuid();

export async function savePlantAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const [user, org] = await Promise.all([getSessionUser(), getCurrentOrg()]);
  if (!user || !org) return { status: "error", formError: "auth.errors.sessionExpired" };

  const values = formDataToObject(formData);
  const id = values.id ? plantId.safeParse(values.id) : null;
  if (id && !id.success) return { status: "error", formError: "plants.notFound" };

  const parsed = parsePlantForm(values);
  if (!parsed.success) return { status: "error", fieldErrors: parsed.fieldErrors };

  try {
    await savePlant(org.id, parsed.plant, parsed.biogas, id?.data);
  } catch (error) {
    console.error("save_plant failed", error);
    const notFound = typeof error === "object" && error !== null && "code" in error && error.code === "P0002";
    return { status: "error", formError: notFound ? "plants.notFound" : "auth.errors.generic" };
  }

  revalidatePath("/[locale]/(app)", "layout");
  return redirect({
    href: { pathname: "/plants", query: { notice: id ? "updated" : "created" } },
    locale: await getLocale(),
  });
}

export async function deletePlantAction(formData: FormData): Promise<void> {
  const locale = await getLocale();
  const id = plantId.safeParse(formData.get("id"));
  if (id.success && (await getSessionUser())) {
    await deletePlant(id.data);
    revalidatePath("/[locale]/(app)", "layout");
  }
  return redirect({ href: { pathname: "/plants", query: { notice: "deleted" } }, locale });
}
