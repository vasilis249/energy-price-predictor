"use client";

import { useTranslations } from "next-intl";
import { Field, fieldProps, FormMessage } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { Input } from "@/components/ui/input";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation/auth";
import { resetPassword } from "../actions";

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const { state, pending, onSubmit, fieldErrors } = useFormAction(resetPassword);

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormMessage messageKey={state.status === "error" ? state.formError : undefined} variant="error" />
      <Field name="password" label={t("newPassword")} hint={t("passwordHint")} error={fieldErrors.password}>
        <Input
          {...fieldProps("password", fieldErrors.password, true)}
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
      </Field>
      <Field name="confirmPassword" label={t("confirmPassword")} error={fieldErrors.confirmPassword}>
        <Input
          {...fieldProps("confirmPassword", fieldErrors.confirmPassword)}
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>
      <SubmitButton pending={pending} className="w-full">
        {t("reset.submit")}
      </SubmitButton>
    </form>
  );
}
