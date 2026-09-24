"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, startTransition] = useTransition();

  return (
    <label className={cn("relative inline-flex items-center gap-1.5 text-sm", className)}>
      <Languages className="size-4 text-muted-foreground" aria-hidden />
      <span className="sr-only">{t("nav.language")}</span>
      <select
        className="cursor-pointer appearance-none rounded-md bg-transparent py-1 pr-1 font-medium hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={locale}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Locale;
          startTransition(() => {
            // @ts-expect-error -- pathname and params always belong to the current route.
            router.replace({ pathname, params }, { locale: next });
          });
        }}
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>
            {t(`language.${l}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
