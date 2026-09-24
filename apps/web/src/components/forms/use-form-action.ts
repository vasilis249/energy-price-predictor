"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { idle, type ActionState } from "@/lib/action-state";

/**
 * Wrap a server action for a form without React's automatic form reset, so users keep what they
 * typed when validation fails. Submits via onSubmit instead of the `action` prop.
 */
export function useFormAction(action: (prev: ActionState, formData: FormData) => Promise<ActionState>) {
  const [state, dispatch, pending] = useActionState(action, idle);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  return { state, pending, onSubmit, fieldErrors };
}
