"use client";

import { LocateFixed } from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Field, fieldProps, FormMessage } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { siteTypes, type SiteType } from "@/lib/validation/site";
import type { Site } from "@/server/sites";
import { saveSiteAction } from "./actions";

const LocationPicker = dynamic(() => import("@/components/map/location-picker").then((m) => m.LocationPicker), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-lg border bg-muted sm:h-96" />,
});

const parse = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

export function SiteForm({ site, defaultType }: { site?: Site; defaultType: SiteType }) {
  const t = useTranslations("sites");
  const tc = useTranslations("common");
  const { state, pending, onSubmit, fieldErrors: e } = useFormAction(saveSiteAction);
  const [latitude, setLatitude] = useState(site ? String(site.latitude) : "");
  const [longitude, setLongitude] = useState(site ? String(site.longitude) : "");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);

  const setPoint = (lat: number, lng: number) => {
    setLatitude(String(lat));
    setLongitude(String(lng));
  };

  const locate = () => {
    if (!navigator.geolocation) return setLocationError(true);
    setLocating(true);
    setLocationError(false);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setPoint(Math.round(position.coords.latitude * 1e5) / 1e5, Math.round(position.coords.longitude * 1e5) / 1e5);
      },
      () => {
        setLocating(false);
        setLocationError(true);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6">
      {site && <input type="hidden" name="id" value={site.id} />}
      <FormMessage messageKey={state.status === "error" ? state.formError : undefined} variant="error" />

      <Card>
        <CardHeader>
          <CardTitle>{t("sectionGeneral")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field name="name" label={t("fields.name")} error={e.name} className="sm:col-span-2">
            <Input
              {...fieldProps("name", e.name)}
              defaultValue={site?.name}
              placeholder={t("fields.namePlaceholder")}
              maxLength={120}
            />
          </Field>
          <Field name="siteType" label={t("fields.siteType")} error={e.siteType} className="sm:col-span-2">
            <Select {...fieldProps("siteType", e.siteType)} defaultValue={site?.site_type ?? defaultType}>
              {siteTypes.map((type) => (
                <option key={type} value={type}>
                  {t(`types.${type}`)}
                </option>
              ))}
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("sectionLocation")}</CardTitle>
          <CardDescription>{t("locationHint")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-3 sm:col-span-2">
            <LocationPicker
              latitude={parse(latitude)}
              longitude={parse(longitude)}
              onChange={setPoint}
              label={t("mapLabel")}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" size="sm" onClick={locate} disabled={locating}>
                <LocateFixed aria-hidden />
                {t("useMyLocation")}
              </Button>
              {locationError && <p className="text-sm text-destructive">{t("locationUnavailable")}</p>}
            </div>
          </div>
          <Field name="latitude" label={t("fields.latitude")} error={e.latitude}>
            <Input
              {...fieldProps("latitude", e.latitude)}
              inputMode="decimal"
              value={latitude}
              onChange={(ev) => setLatitude(ev.target.value)}
              placeholder="39.63900"
            />
          </Field>
          <Field name="longitude" label={t("fields.longitude")} error={e.longitude}>
            <Input
              {...fieldProps("longitude", e.longitude)}
              inputMode="decimal"
              value={longitude}
              onChange={(ev) => setLongitude(ev.target.value)}
              placeholder="22.41900"
            />
          </Field>
          <Field name="municipality" label={t("fields.municipality")} error={e.municipality} optional>
            <Input
              {...fieldProps("municipality", e.municipality)}
              defaultValue={site?.municipality ?? ""}
              placeholder={t("fields.municipalityPlaceholder")}
              maxLength={120}
            />
          </Field>
          <Field name="address" label={t("fields.address")} error={e.address} optional>
            <Input
              {...fieldProps("address", e.address)}
              defaultValue={site?.address ?? ""}
              autoComplete="street-address"
              maxLength={200}
            />
          </Field>
          <Field name="notes" label={t("fields.notes")} error={e.notes} optional className="sm:col-span-2">
            <Textarea {...fieldProps("notes", e.notes)} defaultValue={site?.notes ?? ""} maxLength={2000} rows={3} />
          </Field>
          <Alert className="sm:col-span-2">{t("privacyNote")}</Alert>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button asChild variant="outline">
          <Link href="/sites">{tc("cancel")}</Link>
        </Button>
        <SubmitButton pending={pending}>{pending ? tc("saving") : tc("save")}</SubmitButton>
      </div>
    </form>
  );
}
