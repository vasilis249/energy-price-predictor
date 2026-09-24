"use client";

import { useTranslations } from "next-intl";
import { Field, fieldProps, FormMessage } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { login } from "../actions";

const LINK_ERRORS: Record<string, string> = {
  linkInvalid: "auth.errors.linkInvalid",
  generic: "auth.errors.generic",
};

export function LoginForm({ next, linkError }: { next?: string; linkError?: string }) {
  const t = useTranslations("auth");
  const { state, pending, onSubmit, fieldErrors } = useFormAction(login);
  const formError =
    state.status === "error"
      ? state.formError
      : state.status === "idle" && linkError
        ? LINK_ERRORS[linkError]
        : undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormMessage messageKey={formError} variant="error" />
      {next && <input type="hidden" name="next" value={next} />}
      <Field name="email" label={t("email")} error={fieldErrors.email}>
        <Input
          {...fieldProps("email", fieldErrors.email)}
          type="email"
          autoComplete="email"
          inputMode="email"
          required
        />
      </Field>
      <Field name="password" label={t("password")} error={fieldErrors.password}>
        <Input
          {...fieldProps("password", fieldErrors.password)}
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <div className="-mt-1 text-right text-sm">
        <Link href="/forgot-password" className="text-primary hover:underline">
          {t("login.forgot")}
        </Link>
      </div>
      <SubmitButton pending={pending} className="w-full">
        {t("login.submit")}
      </SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        {t("login.noAccount")}{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          {t("login.signupLink")}
        </Link>
      </p>
    </form>
  );
}
