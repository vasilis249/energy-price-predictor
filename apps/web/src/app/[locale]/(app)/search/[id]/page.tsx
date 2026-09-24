import { ArrowLeft, BadgeCheck, CalendarDays, Droplets, Flame, MapPin, Truck, Zap } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PriceLabel, QuantityLabel } from "@/components/market/labels";
import { ListingsMapLazy } from "@/components/map/listings-map-lazy";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { estimateBiogasM3, estimateElectricityMWh } from "@/lib/market";
import { requireMarketRole } from "@/server/auth";
import { listFeedstockTypes } from "@/server/feedstocks";
import { searchListings } from "@/server/listings";
import { listSites } from "@/server/sites";

export async function generateMetadata({ params }: PageProps<"/[locale]/search/[id]">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "search" });
  return { title: t("title") };
}

export default async function ListingDetailPage({ params, searchParams }: PageProps<"/[locale]/search/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const org = await requireMarketRole("buyer");
  if (!z.uuid().safeParse(id).success) notFound();
  const { site } = await searchParams;
  const sites = await listSites(org.id);
  const origin = sites.find((s) => s.id === site) ?? sites.find((s) => s.site_type === "biogas_plant") ?? sites[0];
  if (!origin) notFound();

  // Same function as the search, so buyers can only ever see active listings, approximately located.
  const [listing] = await searchListings({ siteId: origin.id, listingId: id });
  if (!listing) notFound();

  const t = await getTranslations();
  const format = await getFormatter();
  const feedstock = (await listFeedstockTypes()).find((f) => f.code === listing.feedstock_code);
  const feedstockName = feedstock ? (locale === "el" ? feedstock.name_el : feedstock.name_en) : listing.feedstock_code;
  const biogas = estimateBiogasM3(listing.quantity, feedstock?.typical_biogas_m3_per_t ?? null);
  const electricity = estimateElectricityMWh(biogas);
  const period = t(`listings.periods.${listing.quantity_period}`);
  const date = (d: string) => format.dateTime(new Date(`${d}T12:00:00Z`), { dateStyle: "medium" });

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={{ pathname: "/search", query: { site: origin.id } }}
        className="mb-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("search.backToResults")}
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{listing.title}</h1>
        <p className="mt-1 text-muted-foreground">{feedstockName}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardContent className="grid gap-4 pt-5 text-sm sm:pt-6">
            <p className="text-lg font-semibold">
              <QuantityLabel quantity={listing.quantity} unit={listing.unit} period={listing.quantity_period} />
            </p>
            <p className="text-lg">
              <PriceLabel price={listing.price_per_unit} unit={listing.unit} />
            </p>
            <dl className="grid gap-3">
              <div className="flex gap-2">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <div>
                  <dt className="text-muted-foreground">{t("search.availability")}</dt>
                  <dd>
                    {listing.available_until
                      ? t("search.availableFromTo", {
                          from: date(listing.available_from),
                          to: date(listing.available_until),
                        })
                      : t("search.availableFromOnward", { from: date(listing.available_from) })}
                  </dd>
                </div>
              </div>
              <div className="flex gap-2">
                <Truck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <div>
                  <dt className="text-muted-foreground">{t("listings.fields.transport")}</dt>
                  <dd>{t(`listings.transportTerms.${listing.transport}`)}</dd>
                </div>
              </div>
              {(listing.dm_pct !== null || feedstock?.typical_dm_pct != null) && (
                <div className="flex gap-2">
                  <Droplets className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <div>
                    <dt className="text-muted-foreground">{t("search.dm")}</dt>
                    <dd>
                      {listing.dm_pct !== null
                        ? t("search.dmMeasured", { pct: format.number(listing.dm_pct) })
                        : t("search.dmTypical", { pct: format.number(feedstock!.typical_dm_pct!) })}
                    </dd>
                  </div>
                </div>
              )}
              {biogas !== null && (
                <div className="flex gap-2">
                  <Flame className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <div>
                    <dd>{t("listings.summary.biogas", { m3: format.number(biogas), period })}</dd>
                    {electricity !== null && (
                      <dd className="flex items-center gap-1 text-muted-foreground">
                        <Zap className="size-3.5" aria-hidden />
                        {t("listings.summary.electricity", { mwh: format.number(electricity), period })}
                      </dd>
                    )}
                    <dd className="text-xs text-muted-foreground">{t("listings.summary.estimateNote")}</dd>
                  </div>
                </div>
              )}
            </dl>
            {listing.description && <p className="whitespace-pre-line border-t pt-4">{listing.description}</p>}
          </CardContent>
        </Card>

        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="size-4 text-primary" aria-hidden />
                {t("search.approxLocation", { place: listing.municipality ?? "—" })} ·{" "}
                {t("search.distance", { km: listing.distance_km })}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <ListingsMapLazy
                label={t("search.mapLabel")}
                origin={{ lat: origin.latitude, lon: origin.longitude, label: t("search.yourSite") }}
                points={[
                  {
                    id: listing.listing_id,
                    lat: Number(listing.approx_lat),
                    lon: Number(listing.approx_lon),
                    title: listing.title,
                    subtitle: listing.municipality ?? "",
                    href: getPathname({ href: `/search/${listing.listing_id}`, locale: locale as Locale }),
                  },
                ]}
                areaRadius={3500}
                className="z-0 h-64 w-full overflow-hidden rounded-lg border"
              />
              <p className="text-xs text-muted-foreground">{t("search.approxNote")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="grid gap-3 pt-5 text-sm sm:pt-6">
              <p className="text-muted-foreground">{t("search.seller")}</p>
              <p className="flex items-center gap-1.5 font-medium">
                {listing.seller_name}
                <BadgeCheck className="size-4 text-success" aria-label={t("search.verifiedSeller")} />
              </p>
              <Button disabled className="w-full">
                {t("common.comingSoon")}
              </Button>
              <Alert>{t("search.offerSoon")}</Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
