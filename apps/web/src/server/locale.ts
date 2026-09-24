import "server-only";
import { cookies } from "next/headers";
import type { Locale } from "@/i18n/routing";

/**
 * Persist the UI language in next-intl's locale cookie. Needed before redirecting into a locale
 * the cookie doesn't match (e.g. after login, into the profile's language); otherwise the proxy
 * keeps serving the cookie's language on unprefixed (Greek) URLs.
 */
export async function persistLocale(locale: Locale) {
  (await cookies()).set("NEXT_LOCALE", locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
