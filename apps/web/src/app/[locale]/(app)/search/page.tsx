import { MapPin, Search } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PriceLabel, QuantityLabel } from "@/components/market/labels";
import { ListingsMapLazy } from "@/components/map/listings-map-lazy";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { estimateBiogasM3 } from "@/lib/market";
import { distanceOptions, priceFilters, searchParamsSchema } from "@/lib/validation/search";
import { requireMarketRole } from "@/server/auth";
import { listFeedstockTypes } from "@/server/feedstocks";
import { searchListings } from "@/server/listings";
import { listSites } from "@/server/sites";

export async function generateMetadata({ params }: PageProps<"/[locale]/search">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "search" });
  return { title: t("title") };
}

export default async function SearchPage({ params, searchParams }: PageProps<"/[locale]/search">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const org = await requireMarketRole("buyer");
  const t = await getTranslations();
  const format = await getFormatter();
  const filters = searchParamsSchema.parse(await searchParams);
  const [sites, feedstocks] = await Promise.all([listSites(org.id), listFeedstockTypes()]);

  if (sites.length === 0) {
    return (
      <>
        <PageHeader title={t("search.title")} description={t("search.subtitle")} />
        <Alert className="grid gap-3">
          <p>{t("search.needSite")}</p>
          <Button asChild className="justify-self-start">
            <Link href="/sites/new">{t("sites.add")}</Link>
          </Button>
        </Alert>
      </>
    );
  }

  const origin =
    sites.find((s) => s.id === filters.site) ?? sites.find((s) => s.site_type === "biogas_plant") ?? sites[0];
  const results = await searchListings({
    siteId: origin.id,
    feedstockCodes: filters.type ? [filters.type] : undefined,
    maxKm: filters.km,
    price: filters.price,
  });
  const byCode = new Map(feedstocks.map((f) => [f.code, f]));
  const name = (code: string) => {
    const f = byCode.get(code);
    return f ? (locale === "el" ? f.name_el : f.name_en) : code;
  };
  const detailHref = (id: string) => ({ pathname: `/search/${id}`, query: { site: origin.id } });
  const categories = [...new Set(feedstocks.map((f) => f.category))];

  return (
    <>
      <PageHeader title={t("search.title")} description={t("search.subtitle")} />

      <Card className="mb-6 p-4 sm:p-5">
        <form method="get" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <div className="grid gap-2">
            <Label htmlFor="site">{t("search.from")}</Label>
            <Select id="site" name="site" defaultValue={origin.id}>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">{t("search.types")}</Label>
            <Select id="type" name="type" defaultValue={filters.type ?? ""}>
              <option value="">{t("search.allTypes")}</option>
              {categories.map((category) => (
                <optgroup key={category} label={t(`catalog.categories.${category}`)}>
                  {feedstocks
                    .filter((f) => f.category === category)
                    .map((f) => (
                      <option key={f.code} value={f.code}>
                        {name(f.code)}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="km">{t("search.maxKm")}</Label>
            <Select id="km" name="km" defaultValue={filters.km ? String(filters.km) : ""}>
              <option value="">{t("search.anyDistance")}</option>
              {distanceOptions.map((km) => (
                <option key={km} value={km}>
                  {t("search.km", { km })}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="price">{t("search.price")}</Label>
            <Select id="price" name="price" defaultValue={filters.price ?? ""}>
              <option value="">{t("search.anyPrice")}</option>
              {priceFilters.map((p) => (
                <option key={p} value={p}>
                  {t(`listings.priceModes.${p === "paid" ? "buyer_pays" : p}`)}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit">
            <Search aria-hidden />
            {t("search.submit")}
          </Button>
        </form>
      </Card>

      <p className="mb-3 text-sm font-medium" role="status">
        {t("search.results", { count: results.length })}
      </p>

      {results.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">{t("search.empty")}</Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <ul className="grid content-start gap-3">
            {results.map((r) => {
              const biogas = estimateBiogasM3(
                r.quantity,
                byCode.get(r.feedstock_code)?.typical_biogas_m3_per_t ?? null,
              );
              return (
                <li key={r.listing_id}>
                  <Link
                    href={detailHref(r.listing_id)}
                    className="block rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold">{r.title}</h2>
                        <p className="text-sm text-muted-foreground">{name(r.feedstock_code)}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-sm font-medium tabular-nums">
                        {t("search.distance", { km: r.distance_km })}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-0.5 text-sm">
                      <p className="font-medium">
                        <QuantityLabel quantity={r.quantity} unit={r.unit} period={r.quantity_period} /> ·{" "}
                        <PriceLabel price={r.price_per_unit} unit={r.unit} />
                      </p>
                      {biogas !== null && (
                        <p className="text-muted-foreground">
                          {t("listings.summary.biogas", {
                            m3: format.number(biogas),
                            period: t(`listings.periods.${r.quantity_period}`),
                          })}
                        </p>
                      )}
                      <p className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="size-3.5" aria-hidden />
                        {r.municipality ?? "—"} · {r.seller_name}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="lg:sticky lg:top-20 lg:self-start">
            <ListingsMapLazy
              label={t("search.mapLabel")}
              origin={{ lat: origin.latitude, lon: origin.longitude, label: t("search.yourSite") }}
              points={results.map((r) => ({
                id: r.listing_id,
                lat: Number(r.approx_lat),
                lon: Number(r.approx_lon),
                title: r.title,
                subtitle: `${name(r.feedstock_code)} · ${t("search.distance", { km: r.distance_km })}`,
                href: getPathname({ href: detailHref(r.listing_id), locale }),
              }))}
            />
          </div>
        </div>
      )}
    </>
  );
}
