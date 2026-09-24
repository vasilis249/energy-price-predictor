import type { FieldErrors } from "@/lib/validation/form";

/** Result of a form server action. `formError` / `message` are full i18n keys (e.g. "auth.errors.generic"). */
export type ActionState =
  | { status: "idle" }
  | { status: "error"; fieldErrors?: FieldErrors; formError?: string }
  | { status: "success"; message?: string };

export const idle: ActionState = { status: "idle" };
