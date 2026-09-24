import { defineRouting } from "next-intl/routing";

export const locales = ["el", "en"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "el",
  // Greek (default) lives at "/", English at "/en".
  localePrefix: "as-needed",
});
