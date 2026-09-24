import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/layout/page-header";
import type { Locale } from "@/i18n/routing";
import { getSite } from "@/server/sites";
import { DeleteSiteButton } from "../delete-site-button";
import { SiteForm } from "../site-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/sites/[id]">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "sites" });
  return { title: t("editTitle") };
}

export default async function EditSitePage({ params }: PageProps<"/[locale]/sites/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  if (!z.uuid().safeParse(id).success) notFound();
  // RLS returns null for other organizations' sites, which we treat as not found.
  const site = await getSite(id);
  if (!site) notFound();
  const t = await getTranslations("sites");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t("editTitle")}
        description={site.name}
        actions={<DeleteSiteButton id={site.id} name={site.name} />}
      />
      <SiteForm site={site} defaultType={site.site_type} />
    </div>
  );
}
