import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/layout/page-header";
import { ListingStatusBadge, PriceLabel, QuantityLabel } from "@/components/market/labels";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";
import { estimateBiogasM3 } from "@/lib/market";
import { requireMarketRole } from "@/server/auth";
import { listFeedstockTypes } from "@/server/feedstocks";
import { getMyListing } from "@/server/listings";
import { listSites } from "@/server/sites";
import { ListingForm } from "../listing-form";
import { StatusActions } from "../status-actions";

export async function generateMetadata({ params }: PageProps<"/[locale]/listings/[id]">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "listings" });
  return { title: t("editTitle") };
}

const NOTICES = { created: "created", updated: "updated" } as const;

export default async function EditListingPage({ params, searchParams }: PageProps<"/[locale]/listings/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const org = await requireMarketRole("seller");
  if (!z.uuid().safeParse(id).success) notFound();
  const listing = await getMyListing(id); // RLS: null for other organizations' listings
  if (!listing) notFound();
  const { notice } = await searchParams;
  const t = await getTranslations("listings");
  const format = await getFormatter();
  const [sites, feedstocks] = await Promise.all([listSites(org.id), listFeedstockTypes()]);
  const feedstock = feedstocks.find((f) => f.code === listing.feedstock_code);
  const biogas = estimateBiogasM3(listing.quantity, feedstock?.typical_biogas_m3_per_t ?? null);
  const noticeKey = typeof notice === "string" && notice in NOTICES ? NOTICES[notice as keyof typeof NOTICES] : null;
  const verified = org.verification_status === "verified";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={listing.title}
        description={t("editTitle")}
        actions={<ListingStatusBadge status={listing.status} />}
      />
      {noticeKey && (
        <Alert variant="success" className="mb-4">
          {t(noticeKey)}
        </Alert>
      )}
      <Card className="mb-6">
        <CardContent className="grid gap-4 pt-5 sm:pt-6">
          <div className="grid gap-1 text-sm">
            <p className="font-medium">
              <QuantityLabel quantity={listing.quantity} unit={listing.unit} period={listing.quantity_period} /> ·{" "}
              <PriceLabel price={listing.price_per_unit} unit={listing.unit} />
            </p>
            {biogas !== null && (
              <p className="text-muted-foreground">
                {t("summary.biogas", { m3: format.number(biogas), period: t(`periods.${listing.quantity_period}`) })}
              </p>
            )}
            {listing.published_at && (
              <p className="text-xs text-muted-foreground">
                {t("summary.published", {
                  date: format.dateTime(new Date(listing.published_at), { dateStyle: "medium" }),
                })}
              </p>
            )}
          </div>
          {!verified && listing.status === "draft" && <Alert variant="warning">{t("publishNeedsVerification")}</Alert>}
          <StatusActions id={listing.id} status={listing.status} canPublish={verified} />
        </CardContent>
      </Card>
      {listing.status === "closed" ? (
        <Alert>{t("errors.closed")}</Alert>
      ) : (
        <ListingForm listing={listing} sites={sites} feedstocks={feedstocks} locale={await getLocale()} />
      )}
    </div>
  );
}
