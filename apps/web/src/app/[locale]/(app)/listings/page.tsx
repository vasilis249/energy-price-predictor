import { Plus, Store } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { ListingStatusBadge, PriceLabel, QuantityLabel } from "@/components/market/labels";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireMarketRole } from "@/server/auth";
import { listFeedstockTypes } from "@/server/feedstocks";
import { listMyListings } from "@/server/listings";

export async function generateMetadata({ params }: PageProps<"/[locale]/listings">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "listings" });
  return { title: t("title") };
}

export default async function ListingsPage({ params, searchParams }: PageProps<"/[locale]/listings">) {
  setRequestLocale((await params).locale as Locale);
  const org = await requireMarketRole("seller");
  const { notice } = await searchParams;
  const t = await getTranslations("listings");
  const locale = await getLocale();
  const [listings, feedstocks] = await Promise.all([listMyListings(org.id), listFeedstockTypes()]);
  const feedstockName = (code: string) => {
    const f = feedstocks.find((x) => x.code === code);
    return f ? (locale === "el" ? f.name_el : f.name_en) : code;
  };

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Button asChild>
            <Link href="/listings/new">
              <Plus aria-hidden />
              {t("add")}
            </Link>
          </Button>
        }
      />
      {notice === "deleted" && (
        <Alert variant="success" className="mb-4">
          {t("deleted")}
        </Alert>
      )}
      {listings.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Store className="size-6" aria-hidden />
          </span>
          <p className="font-medium">{t("empty")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t("emptyHint")}</p>
          <Button asChild className="mt-2">
            <Link href="/listings/new">{t("add")}</Link>
          </Button>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <li key={l.id}>
              <Link
                href={`/listings/${l.id}`}
                className="block h-full rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold">{l.title}</h2>
                  <ListingStatusBadge status={l.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{feedstockName(l.feedstock_code)}</p>
                <p className="mt-3 text-sm font-medium">
                  <QuantityLabel quantity={l.quantity} unit={l.unit} period={l.quantity_period} />
                </p>
                <p className="text-sm">
                  <PriceLabel price={l.price_per_unit} unit={l.unit} />
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
