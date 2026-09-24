"use client";

import { useTranslations } from "next-intl";
import { Field, fieldProps, FormMessage, ValidationMessage } from "@/components/forms/field";
import { RolePicker } from "@/components/forms/role-picker";
import { SubmitButton } from "@/components/forms/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation/auth";
import type { MarketRole } from "@/lib/validation/organization";
import { signup } from "../actions";

export function SignupForm({ role }: { role?: MarketRole }) {
  const t = useTranslations("auth");
  const { state, pending, onSubmit, fieldErrors } = useFormAction(signup);

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormMessage messageKey={state.status === "error" ? state.formError : undefined} variant="error" />
      <RolePicker defaultValue={role} error={fieldErrors.marketRole} />
      <Field name="fullName" label={t("fullName")} error={fieldErrors.fullName}>
        <Input {...fieldProps("fullName", fieldErrors.fullName)} autoComplete="name" required maxLength={120} />
      </Field>
      <Field name="orgName" label={t("orgName")} hint={t("orgNameHint")} error={fieldErrors.orgName} optional>
        <Input {...fieldProps("orgName", fieldErrors.orgName, true)} autoComplete="organization" maxLength={120} />
      </Field>
      <Field name="email" label={t("email")} error={fieldErrors.email}>
        <Input
          {...fieldProps("email", fieldErrors.email)}
          type="email"
          autoComplete="email"
          inputMode="email"
          required
        />
      </Field>
      <Field name="password" label={t("password")} hint={t("passwordHint")} error={fieldErrors.password}>
        <Input
          {...fieldProps("password", fieldErrors.password, true)}
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
      </Field>
      <div className="grid gap-1.5">
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            name="acceptTerms"
            className="mt-0.5 size-4 accent-primary"
            aria-invalid={fieldErrors.acceptTerms ? true : undefined}
            aria-describedby={fieldErrors.acceptTerms ? "acceptTerms-error" : undefined}
          />
          <span>
            {t.rich("acceptTerms", {
              terms: (chunks) => (
                <Link href="/terms" target="_blank" className="text-primary underline">
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link href="/privacy" target="_blank" className="text-primary underline">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>
        {fieldErrors.acceptTerms && (
          <p id="acceptTerms-error" className="text-sm text-destructive">
            <ValidationMessage code={fieldErrors.acceptTerms} />
          </p>
        )}
      </div>
      <SubmitButton pending={pending} className="w-full">
        {t("signup.submit")}
      </SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        {t("signup.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("signup.loginLink")}
        </Link>
      </p>
    </form>
  );
}
