"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Field, fieldProps, FormMessage, ValidationMessage } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import type { Tables } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { priceModeOf, priceModes, quantityPeriods, quantityUnits, transportTerms } from "@/lib/validation/listing";
import { saveListingAction } from "./actions";

type Feedstock = Pick<Tables<"feedstock_types">, "code" | "category" | "name_el" | "name_en" | "default_unit">;
type SiteOption = Pick<Tables<"sites">, "id" | "name">;

const today = () => new Date().toISOString().slice(0, 10);
const str = (v: number | string | null | undefined) => (v === null || v === undefined ? "" : String(v));

export function ListingForm({
  listing,
  sites,
  feedstocks,
  locale,
}: {
  listing?: Tables<"listings">;
  sites: SiteOption[];
  feedstocks: Feedstock[];
  locale: string;
}) {
  const t = useTranslations("listings");
  const tc = useTranslations("common");
  const tCat = useTranslations("catalog.categories");
  const { state, pending, onSubmit, fieldErrors: e } = useFormAction(saveListingAction);
  const [feedstock, setFeedstock] = useState(listing?.feedstock_code ?? "");
  const [unit, setUnit] = useState<string>(listing?.unit ?? "t");
  const [priceMode, setPriceMode] = useState<string>(listing ? priceModeOf(listing.price_per_unit) : "buyer_pays");

  const categories = [...new Set(feedstocks.map((f) => f.category))];
  const name = (f: Feedstock) => (locale === "el" ? f.name_el : f.name_en);

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6">
      {listing && <input type="hidden" name="id" value={listing.id} />}
      <FormMessage messageKey={state.status === "error" ? state.formError : undefined} variant="error" />

      <Card>
        <CardHeader>
          <CardTitle>{t("sectionWhat")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field name="feedstockCode" label={t("fields.feedstock")} error={e.feedstockCode}>
            <Select
              {...fieldProps("feedstockCode", e.feedstockCode)}
              value={feedstock}
              onChange={(ev) => {
                setFeedstock(ev.target.value);
                const chosen = feedstocks.find((f) => f.code === ev.target.value);
                if (chosen && !listing) setUnit(chosen.default_unit);
              }}
            >
              <option value="" disabled>
                —
              </option>
              {categories.map((category) => (
                <optgroup key={category} label={tCat(category)}>
                  {feedstocks
                    .filter((f) => f.category === category)
                    .map((f) => (
                      <option key={f.code} value={f.code}>
                        {name(f)}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <Field name="siteId" label={t("fields.site")} error={e.siteId}>
            <Select {...fieldProps("siteId", e.siteId)} defaultValue={listing?.site_id ?? sites[0]?.id}>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field name="title" label={t("fields.title")} error={e.title} className="sm:col-span-2">
            <Input
              {...fieldProps("title", e.title)}
              defaultValue={listing?.title}
              placeholder={t("fields.titlePlaceholder")}
              maxLength={120}
            />
          </Field>
          <Field
            name="description"
            label={t("fields.description")}
            hint={t("fields.descriptionHint")}
            error={e.description}
            optional
            className="sm:col-span-2"
          >
            <Textarea
              {...fieldProps("description", e.description, true)}
              defaultValue={listing?.description ?? ""}
              rows={4}
              maxLength={4000}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("sectionHowMuch")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-3">
          <Field name="quantity" label={t("fields.quantity")} error={e.quantity}>
            <Input {...fieldProps("quantity", e.quantity)} inputMode="decimal" defaultValue={str(listing?.quantity)} />
          </Field>
          <Field name="unit" label={t("fields.unit")} error={e.unit}>
            <Select {...fieldProps("unit", e.unit)} value={unit} onChange={(ev) => setUnit(ev.target.value)}>
              {quantityUnits.map((u) => (
                <option key={u} value={u}>
                  {t(`units.${u}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field name="quantityPeriod" label={t("fields.quantityPeriod")} error={e.quantityPeriod}>
            <Select
              {...fieldProps("quantityPeriod", e.quantityPeriod)}
              defaultValue={listing?.quantity_period ?? "month"}
            >
              {quantityPeriods.map((p) => (
                <option key={p} value={p}>
                  {t(`periods.${p}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field name="availableFrom" label={t("fields.availableFrom")} error={e.availableFrom}>
            <Input
              {...fieldProps("availableFrom", e.availableFrom)}
              type="date"
              defaultValue={listing?.available_from ?? today()}
            />
          </Field>
          <Field
            name="availableUntil"
            label={t("fields.availableUntil")}
            hint={t("fields.availableUntilHint")}
            error={e.availableUntil}
            optional
          >
            <Input
              {...fieldProps("availableUntil", e.availableUntil, true)}
              type="date"
              defaultValue={listing?.available_until ?? ""}
            />
          </Field>
          <Field name="dmPct" label={t("fields.dmPct")} hint={t("fields.dmPctHint")} error={e.dmPct} optional>
            <Input {...fieldProps("dmPct", e.dmPct, true)} inputMode="decimal" defaultValue={str(listing?.dm_pct)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("sectionPrice")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">{t("fields.priceMode")}</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {priceModes.map((mode) => (
                <label
                  key={mode}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border bg-card p-3 text-sm transition-colors",
                    "has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  )}
                >
                  <input
                    type="radio"
                    name="priceMode"
                    value={mode}
                    checked={priceMode === mode}
                    onChange={() => setPriceMode(mode)}
                    className="accent-primary"
                  />
                  {t(`priceModes.${mode}`)}
                </label>
              ))}
            </div>
            {priceMode === "gate_fee" && <p className="text-xs text-muted-foreground">{t("gateFeeHint")}</p>}
            {e.priceMode && (
              <p className="text-sm text-destructive">
                <ValidationMessage code={e.priceMode} />
              </p>
            )}
          </fieldset>
          {priceMode !== "free" && (
            <Field
              name="priceAmount"
              label={t("fields.priceAmount", { unit: t(`units.${unit as "t" | "m3"}`) })}
              error={e.priceAmount}
              className="sm:max-w-xs"
            >
              <Input
                {...fieldProps("priceAmount", e.priceAmount)}
                inputMode="decimal"
                defaultValue={listing && listing.price_per_unit !== 0 ? str(Math.abs(listing.price_per_unit)) : ""}
              />
            </Field>
          )}
          <Field name="transport" label={t("fields.transport")} error={e.transport} className="sm:max-w-sm">
            <Select {...fieldProps("transport", e.transport)} defaultValue={listing?.transport ?? "negotiable"}>
              {transportTerms.map((term) => (
                <option key={term} value={term}>
                  {t(`transportTerms.${term}`)}
                </option>
              ))}
            </Select>
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button asChild variant="outline">
          <Link href="/listings">{tc("cancel")}</Link>
        </Button>
        <SubmitButton pending={pending}>{pending ? tc("saving") : tc("save")}</SubmitButton>
      </div>
    </form>
  );
}
