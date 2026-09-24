"use client";

import { useTranslations } from "next-intl";
import { Field, fieldProps, FormMessage } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { Input, Select } from "@/components/ui/input";
import { routing } from "@/i18n/routing";
import { updateOrganization, updateProfile } from "./actions";

export function ProfileForm({ fullName, locale }: { fullName: string; locale: string }) {
  const t = useTranslations();
  const { state, pending, onSubmit, fieldErrors: e } = useFormAction(updateProfile);
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormMessage messageKey={state.status === "error" ? state.formError : undefined} variant="error" />
      <Field name="fullName" label={t("auth.fullName")} error={e.fullName}>
        <Input {...fieldProps("fullName", e.fullName)} defaultValue={fullName} autoComplete="name" maxLength={120} />
      </Field>
      <Field name="locale" label={t("settings.languageTitle")} hint={t("settings.languageHint")} error={e.locale}>
        <Select {...fieldProps("locale", e.locale, true)} defaultValue={locale}>
          {routing.locales.map((l) => (
            <option key={l} value={l}>
              {t(`language.${l}`)}
            </option>
          ))}
        </Select>
      </Field>
      <SubmitButton pending={pending} className="justify-self-start">
        {t("common.save")}
      </SubmitButton>
    </form>
  );
}

type OrgDefaults = { name: string; legalName: string; vatNumber: string; phone: string };

export function OrganizationForm({ org, canEdit }: { org: OrgDefaults; canEdit: boolean }) {
  const t = useTranslations();
  const { state, pending, onSubmit, fieldErrors: e } = useFormAction(updateOrganization);
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormMessage messageKey={state.status === "error" ? state.formError : undefined} variant="error" />
      <FormMessage messageKey={state.status === "success" ? state.message : undefined} variant="success" />
      <fieldset disabled={!canEdit} className="grid gap-4">
        <Field name="orgName" label={t("settings.orgName")} error={e.orgName}>
          <Input {...fieldProps("orgName", e.orgName)} defaultValue={org.name} maxLength={120} />
        </Field>
        <Field name="legalName" label={t("onboarding.legalName")} error={e.legalName}>
          <Input {...fieldProps("legalName", e.legalName)} defaultValue={org.legalName} maxLength={200} />
        </Field>
        <Field name="vatNumber" label={t("onboarding.vatNumber")} error={e.vatNumber}>
          <Input
            {...fieldProps("vatNumber", e.vatNumber)}
            defaultValue={org.vatNumber}
            inputMode="numeric"
            maxLength={14}
          />
        </Field>
        <Field name="phone" label={t("onboarding.phone")} error={e.phone}>
          <Input {...fieldProps("phone", e.phone)} defaultValue={org.phone} type="tel" inputMode="tel" />
        </Field>
      </fieldset>
      <p className="text-xs text-muted-foreground">
        {canEdit ? t("settings.identityChangeNote") : t("settings.orgOwnerOnly")}
      </p>
      {canEdit && (
        <SubmitButton pending={pending} className="justify-self-start">
          {t("common.save")}
        </SubmitButton>
      )}
    </form>
  );
}
