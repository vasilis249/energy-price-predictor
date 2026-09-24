"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/server/admin";

const input = z.object({
  orgId: z.uuid(),
  status: z.enum(["verified", "rejected"]),
  note: z.string().trim().max(1000).optional(),
});

export async function setVerification(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = input.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", formError: "auth.errors.generic" };
  const { orgId, status, note } = parsed.data;
  if (status === "rejected" && !note) return { status: "error", fieldErrors: { note: "required" } };

  // The database function re-checks that the caller is a platform admin.
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_verification", {
    p_org_id: orgId,
    p_status: status,
    p_note: note || undefined,
  });
  if (error) {
    console.error("admin_set_verification failed", error);
    return { status: "error", formError: "auth.errors.generic" };
  }
  revalidatePath("/[locale]", "layout");
  return { status: "success", message: "admin.updated" };
}
