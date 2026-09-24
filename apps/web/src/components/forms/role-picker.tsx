"use client";

import { Factory, Tractor } from "lucide-react";
import { useTranslations } from "next-intl";
import { ValidationMessage } from "@/components/forms/field";
import { cn } from "@/lib/utils";
import type { MarketRole } from "@/lib/validation/organization";

/** Two large radio cards: easy to tap on a phone, clear for non-technical users. */
export function RolePicker({ defaultValue, error }: { defaultValue?: MarketRole; error?: string }) {
  const t = useTranslations("auth");
  const options = [
    { value: "seller", icon: Tractor, title: t("roleSeller"), hint: t("roleSellerHint") },
    { value: "buyer", icon: Factory, title: t("roleBuyer"), hint: t("roleBuyerHint") },
  ] as const;
  return (
    <fieldset className="grid gap-2" aria-describedby={error ? "marketRole-error" : undefined}>
      <legend className="mb-2 text-sm font-medium">{t("roleQuestion")}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map(({ value, icon: Icon, title, hint }) => (
          <label
            key={value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-4 transition-colors",
              "has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
              error && "border-destructive",
            )}
          >
            <input
              type="radio"
              name="marketRole"
              value={value}
              defaultChecked={defaultValue === value}
              className="sr-only"
            />
            <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <span className="grid gap-1">
              <span className="font-medium">{title}</span>
              <span className="text-xs text-muted-foreground">{hint}</span>
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id="marketRole-error" className="text-sm text-destructive">
          <ValidationMessage code={error} />
        </p>
      )}
    </fieldset>
  );
}
