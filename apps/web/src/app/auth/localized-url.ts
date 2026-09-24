import { hasLocale } from "next-intl";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export function localeFrom(value: string | null): Locale {
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}

/** Absolute URL for an app path in the given locale (Greek has no prefix, English uses /en). */
export function localizedUrl(request: Request, locale: Locale, path: string, query?: Record<string, string>) {
  const url = new URL(getPathname({ href: path, locale }), request.url);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);
  return url;
}
