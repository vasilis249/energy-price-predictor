"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { CONSENT_COOKIE, parseConsent, serializeConsent, type Consent } from "@/lib/consent";

function readConsent(): Consent | null {
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
    ?.slice(CONSENT_COOKIE.length + 1);
  return parseConsent(raw);
}

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function CookieBanner() {
  const t = useTranslations("cookies");
  // Server snapshot "decided" avoids flashing the banner before hydration.
  const decided = useSyncExternalStore(
    subscribe,
    () => readConsent() !== null,
    () => true,
  );
  if (decided) return null;

  const save = (analytics: boolean) => {
    const maxAge = 60 * 60 * 24 * 180;
    document.cookie = `${CONSENT_COOKIE}=${serializeConsent({ analytics })}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
    listeners.forEach((l) => l());
  };

  return (
    <div
      role="region"
      aria-label={t("title")}
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 p-4 shadow-lg backdrop-blur sm:inset-x-auto sm:bottom-4 sm:left-4 sm:max-w-sm sm:rounded-xl sm:border"
    >
      <p className="text-sm">
        {t("body")}{" "}
        <Link href="/cookies" className="text-primary underline">
          {t("learnMore")}
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={() => save(false)}>
          {t("necessaryOnly")}
        </Button>
        <Button size="sm" className="flex-1" onClick={() => save(true)}>
          {t("acceptAll")}
        </Button>
      </div>
    </div>
  );
}
