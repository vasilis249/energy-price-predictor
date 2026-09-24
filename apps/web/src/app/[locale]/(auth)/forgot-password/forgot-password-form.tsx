"use client";

import { useTranslations } from "next-intl";
import { Field, fieldProps, FormMessage } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { requestPasswordReset } from "../actions";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const { state, pending, onSubmit, fieldErrors } = useFormAction(requestPasswordReset);

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormMessage messageKey={state.status === "error" ? state.formError : undefined} variant="error" />
      <FormMessage messageKey={state.status === "success" ? state.message : undefined} variant="success" />
      <Field name="email" label={t("email")} error={fieldErrors.email}>
        <Input
          {...fieldProps("email", fieldErrors.email)}
          type="email"
          autoComplete="email"
          inputMode="email"
          required
        />
      </Field>
      <SubmitButton pending={pending} className="w-full">
        {t("forgot.submit")}
      </SubmitButton>
      <Link href="/login" className="text-center text-sm text-primary hover:underline">
        {t("forgot.backToLogin")}
      </Link>
    </form>
  );
}
