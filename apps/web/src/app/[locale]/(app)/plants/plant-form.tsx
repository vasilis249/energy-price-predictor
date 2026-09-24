"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Field, fieldProps, FormMessage } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { plantTypes, supportSchemes } from "@/lib/validation/plant";
import type { PlantWithBiogas } from "@/server/plants";
import { savePlantAction } from "./actions";

const str = (v: number | string | null | undefined) => (v === null || v === undefined ? "" : String(v));

export function PlantForm({ plant }: { plant?: PlantWithBiogas }) {
  const t = useTranslations("plants");
  const tc = useTranslations("common");
  const { state, pending, onSubmit, fieldErrors: e } = useFormAction(savePlantAction);
  const [plantType, setPlantType] = useState<string>(plant?.plant_type ?? "biogas");
  const [scheme, setScheme] = useState<string>(plant?.support_scheme ?? "fip");
  const b = plant?.biogas_params;

  const decimal = { inputMode: "decimal" as const, autoComplete: "off" };

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6">
      {plant && <input type="hidden" name="id" value={plant.id} />}
      <FormMessage messageKey={state.status === "error" ? state.formError : undefined} variant="error" />

      <Card>
        <CardHeader>
          <CardTitle>{t("sectionGeneral")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field name="name" label={t("fields.name")} error={e.name} className="sm:col-span-2">
            <Input {...fieldProps("name", e.name)} defaultValue={plant?.name} maxLength={120} required />
          </Field>
          <Field name="plantType" label={t("fields.plantType")} error={e.plantType}>
            <Select
              {...fieldProps("plantType", e.plantType)}
              value={plantType}
              onChange={(ev) => setPlantType(ev.target.value)}
            >
              {plantTypes.map((type) => (
                <option key={type} value={type}>
                  {t(`types.${type}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field name="capacityMw" label={t("fields.capacityMw")} error={e.capacityMw}>
            <Input
              {...fieldProps("capacityMw", e.capacityMw)}
              {...decimal}
              defaultValue={str(plant?.capacity_mw)}
              required
            />
          </Field>
          <Field
            name="supportScheme"
            label={t("fields.supportScheme")}
            error={e.supportScheme}
            className="sm:col-span-2"
          >
            <Select
              {...fieldProps("supportScheme", e.supportScheme)}
              value={scheme}
              onChange={(ev) => setScheme(ev.target.value)}
            >
              {supportSchemes.map((s) => (
                <option key={s} value={s}>
                  {t(`schemes.${s}`)}
                </option>
              ))}
            </Select>
          </Field>
          {scheme === "fit" && (
            <Alert variant="warning" className="sm:col-span-2">
              {t("fitNotice")}
            </Alert>
          )}
        </CardContent>
      </Card>

      {plantType === "biogas" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("sectionBiogas")}</CardTitle>
            <CardDescription>{t("sectionBiogasHint")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Field
              name="avgProductionMw"
              label={t("fields.avgProductionMw")}
              hint={t("fields.avgProductionMwHint")}
              error={e.avgProductionMw}
            >
              <Input
                {...fieldProps("avgProductionMw", e.avgProductionMw, true)}
                {...decimal}
                defaultValue={str(b?.avg_production_mw)}
              />
            </Field>
            <Field
              name="gasStorageHours"
              label={t("fields.gasStorageHours")}
              hint={t("fields.gasStorageHoursHint")}
              error={e.gasStorageHours}
            >
              <Input
                {...fieldProps("gasStorageHours", e.gasStorageHours, true)}
                {...decimal}
                defaultValue={str(b?.gas_storage_hours)}
              />
            </Field>
            <Field name="maxLoadMw" label={t("fields.maxLoadMw")} error={e.maxLoadMw}>
              <Input {...fieldProps("maxLoadMw", e.maxLoadMw)} {...decimal} defaultValue={str(b?.max_load_mw)} />
            </Field>
            <Field name="minLoadPct" label={t("fields.minLoadPct")} error={e.minLoadPct}>
              <Input
                {...fieldProps("minLoadPct", e.minLoadPct)}
                {...decimal}
                defaultValue={str(b?.min_load_pct ?? 50)}
              />
            </Field>
            <Field name="maxStartsPerDay" label={t("fields.maxStartsPerDay")} error={e.maxStartsPerDay}>
              <Input
                {...fieldProps("maxStartsPerDay", e.maxStartsPerDay)}
                inputMode="numeric"
                defaultValue={str(b?.max_starts_per_day ?? 2)}
              />
            </Field>
            <Field
              name="rampMwPerHour"
              label={t("fields.rampMwPerHour")}
              hint={t("fields.rampMwPerHourHint")}
              error={e.rampMwPerHour}
              optional
            >
              <Input
                {...fieldProps("rampMwPerHour", e.rampMwPerHour, true)}
                {...decimal}
                defaultValue={str(b?.ramp_mw_per_hour)}
              />
            </Field>
            <Field name="minUpHours" label={t("fields.minUpHours")} error={e.minUpHours}>
              <Input
                {...fieldProps("minUpHours", e.minUpHours)}
                {...decimal}
                defaultValue={str(b?.min_up_hours ?? 1)}
              />
            </Field>
            <Field name="minDownHours" label={t("fields.minDownHours")} error={e.minDownHours}>
              <Input
                {...fieldProps("minDownHours", e.minDownHours)}
                {...decimal}
                defaultValue={str(b?.min_down_hours ?? 1)}
              />
            </Field>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("sectionLocation")}</CardTitle>
          <CardDescription>{t("coordinatesHint")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field
            name="locationName"
            label={t("fields.locationName")}
            error={e.locationName}
            optional
            className="sm:col-span-2"
          >
            <Input
              {...fieldProps("locationName", e.locationName)}
              defaultValue={plant?.location_name ?? ""}
              placeholder={t("fields.locationNamePlaceholder")}
              maxLength={120}
            />
          </Field>
          <Field name="latitude" label={t("fields.latitude")} error={e.latitude} optional>
            <Input
              {...fieldProps("latitude", e.latitude)}
              {...decimal}
              defaultValue={str(plant?.latitude)}
              placeholder="39.639"
            />
          </Field>
          <Field name="longitude" label={t("fields.longitude")} error={e.longitude} optional>
            <Input
              {...fieldProps("longitude", e.longitude)}
              {...decimal}
              defaultValue={str(plant?.longitude)}
              placeholder="22.419"
            />
          </Field>
          <Field name="notes" label={t("fields.notes")} error={e.notes} optional className="sm:col-span-2">
            <Textarea {...fieldProps("notes", e.notes)} defaultValue={plant?.notes ?? ""} maxLength={2000} rows={3} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button asChild variant="outline">
          <Link href="/plants">{tc("cancel")}</Link>
        </Button>
        <SubmitButton pending={pending}>{pending ? tc("saving") : tc("save")}</SubmitButton>
      </div>
    </form>
  );
}
