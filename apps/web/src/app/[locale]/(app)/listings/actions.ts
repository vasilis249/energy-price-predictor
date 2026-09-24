"use server";

import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import type { ActionState } from "@/lib/action-state";
import { formDataToObject, toFieldErrors } from "@/lib/validation/form";
import { listingSchema } from "@/lib/validation/listing";
import { getCurrentOrg } from "@/server/auth";
import { createListing, deleteDraftListing, setListingStatus, updateListing } from "@/server/listings";

const listingId = z.uuid();
const statusInput = z.object({ id: z.uuid(), status: z.enum(["active", "paused", "closed"]) });

export async function saveListingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const org = await getCurrentOrg();
  if (!org || org.market_role !== "seller") return { status: "error", formError: "auth.errors.sessionExpired" };

  const values = formDataToObject(formData);
  const id = values.id ? listingId.safeParse(values.id) : null;
  if (id && !id.success) return { status: "error", formError: "auth.errors.generic" };

  const parsed = listingSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error) };

  let savedId: string;
  try {
    if (id) {
      if (!(await updateListing(id.data, parsed.data))) return { status: "error", formError: "listings.errors.closed" };
      savedId = id.data;
    } else {
      savedId = await createListing(org.id, parsed.data);
    }
  } catch (error) {
    console.error("saving listing failed", error);
    return { status: "error", formError: "auth.errors.generic" };
  }
  revalidatePath("/[locale]", "layout");
  return redirect({
    href: { pathname: `/listings/${savedId}`, query: { notice: id ? "updated" : "created" } },
    locale: await getLocale(),
  });
}

export async function setListingStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = statusInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", formError: "auth.errors.generic" };
  const problem = await setListingStatus(parsed.data.id, parsed.data.status);
  if (problem === "notFound") return { status: "error", formError: "auth.errors.generic" };
  if (problem) return { status: "error", formError: `listings.errors.${problem}` };
  revalidatePath("/[locale]", "layout");
  return { status: "success", message: "listings.statusChanged" };
}

export async function deleteListingAction(formData: FormData): Promise<void> {
  const locale = await getLocale();
  const id = listingId.safeParse(formData.get("id"));
  if (id.success) {
    await deleteDraftListing(id.data);
    revalidatePath("/[locale]", "layout");
  }
  return redirect({ href: { pathname: "/listings", query: { notice: "deleted" } }, locale });
}
