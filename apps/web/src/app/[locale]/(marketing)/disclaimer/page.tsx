import { setRequestLocale } from "next-intl/server";
import { LegalPage, legalMetadata } from "@/components/layout/legal-page";
import type { Locale } from "@/i18n/routing";

export const generateMetadata = legalMetadata("disclaimer");

export default async function Page({ params }: PageProps<"/[locale]/disclaimer">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  return <LegalPage doc="disclaimer" locale={locale} />;
}
