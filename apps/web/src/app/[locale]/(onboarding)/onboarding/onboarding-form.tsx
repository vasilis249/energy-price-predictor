"use client";

import { useTranslations } from "next-intl";
import { Field, fieldProps, FormMessage } from "@/components/forms/field";
import { RolePicker } from "@/components/forms/role-picker";
import { SubmitButton } from "@/components/forms/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { Input } from "@/components/ui/input";
import type { MarketRole } from "@/lib/validation/organization";
import { completeOnboarding } from "./actions";

type Defaults = { marketRole: MarketRole | null; legalName: string; vatNumber: string; phone: string };

export function OnboardingForm({ defaults }: { defaults: Defaults }) {
  const t = useTranslations();
  const { state, pending, onSubmit, fieldErrors: e } = useFormAction(completeOnboarding);
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <FormMessage messageKey={state.status === "error" ? state.formError : undefined} variant="error" />
      {defaults.marketRole ? (
        <input type="hidden" name="marketRole" value={defaults.marketRole} />
      ) : (
        <RolePicker error={e.marketRole} />
      )}
      <Field name="legalName" label={t("onboarding.legalName")} error={e.legalName}>
        <Input
          {...fieldProps("legalName", e.legalName)}
          defaultValue={defaults.legalName}
          autoComplete="organization"
          maxLength={200}
        />
      </Field>
      <Field name="vatNumber" label={t("onboarding.vatNumber")} hint={t("onboarding.vatHint")} error={e.vatNumber}>
        <Input
          {...fieldProps("vatNumber", e.vatNumber, true)}
          defaultValue={defaults.vatNumber}
          inputMode="numeric"
          autoComplete="off"
          maxLength={14}
        />
      </Field>
      <Field name="phone" label={t("onboarding.phone")} hint={t("onboarding.phoneHint")} error={e.phone}>
        <Input
          {...fieldProps("phone", e.phone, true)}
          defaultValue={defaults.phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
        />
      </Field>
      <SubmitButton pending={pending} className="w-full">
        {t("onboarding.submit")}
      </SubmitButton>
    </form>
  );
}
