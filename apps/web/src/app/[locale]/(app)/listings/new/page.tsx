import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireMarketRole } from "@/server/auth";
import { listFeedstockTypes } from "@/server/feedstocks";
import { listSites } from "@/server/sites";
import { ListingForm } from "../listing-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/listings/new">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "listings" });
  return { title: t("newTitle") };
}

export default async function NewListingPage({ params }: PageProps<"/[locale]/listings/new">) {
  setRequestLocale((await params).locale as Locale);
  const org = await requireMarketRole("seller");
  const t = await getTranslations();
  const [sites, feedstocks] = await Promise.all([listSites(org.id), listFeedstockTypes()]);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("listings.newTitle")} />
      {sites.length === 0 ? (
        <Alert className="grid gap-3">
          <p>{t("listings.needSite")}</p>
          <Button asChild className="justify-self-start">
            <Link href="/sites/new">{t("sites.add")}</Link>
          </Button>
        </Alert>
      ) : (
        <ListingForm sites={sites} feedstocks={feedstocks} locale={await getLocale()} />
      )}
    </div>
  );
}
