"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Props to spread on the control inside a <Field>: wires id, name, error state and descriptions. */
export function fieldProps(name: string, error?: string, hint?: boolean) {
  const describedBy = [hint ? `${name}-hint` : null, error ? `${name}-error` : null].filter(Boolean).join(" ");
  return {
    id: name,
    name,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
  } as const;
}

export function Field({
  name,
  label,
  hint,
  error,
  optional,
  className,
  children,
}: {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const t = useTranslations();
  return (
    <div className={cn("grid content-start gap-2", className)}>
      <Label htmlFor={name}>
        {label}
        {optional && <span className="ml-1 font-normal text-muted-foreground">({t("common.optional")})</span>}
      </Label>
      {children}
      {hint && (
        <p id={`${name}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="text-sm text-destructive">
          <ValidationMessage code={error} />
        </p>
      )}
    </div>
  );
}

export function ValidationMessage({ code }: { code: string }) {
  const t = useTranslations("validation");
  const key = code as Parameters<typeof t>[0];
  return <>{t.has(key) ? t(key) : code}</>;
}

/** Form-level error or success message from an ActionState i18n key. */
export function FormMessage({ messageKey, variant }: { messageKey?: string; variant: "error" | "success" }) {
  const t = useTranslations();
  if (!messageKey) return null;
  const key = messageKey as Parameters<typeof t>[0];
  const text = t.has(key) ? t(key) : t("auth.errors.generic");
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        variant === "error"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-success/40 bg-success/10",
      )}
    >
      {text}
    </div>
  );
}
