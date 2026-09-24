import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import type { Locale } from "@/i18n/routing";
import { getCurrentOrg } from "@/server/auth";
import { SiteForm } from "../site-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/sites/new">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "sites" });
  return { title: t("newTitle") };
}

export default async function NewSitePage({ params }: PageProps<"/[locale]/sites/new">) {
  setRequestLocale((await params).locale as Locale);
  const t = await getTranslations("sites");
  const org = await getCurrentOrg();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("newTitle")} />
      <SiteForm defaultType={org?.market_role === "buyer" ? "biogas_plant" : "livestock_farm"} />
    </div>
  );
}
