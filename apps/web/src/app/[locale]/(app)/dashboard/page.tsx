import { BookOpen, MapPin, Plus, Search, Store } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { VerificationBadge } from "@/components/layout/status-badge";
import { VerificationBanner } from "@/components/layout/verification-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCurrentOrg, getProfile, getSessionUser } from "@/server/auth";
import { listMyListings, searchListings } from "@/server/listings";
import { listSites } from "@/server/sites";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "dashboard" });
  return { title: t("title") };
}

export default async function DashboardPage({ params }: PageProps<"/[locale]/dashboard">) {
  setRequestLocale((await params).locale as Locale);
  const t = await getTranslations();
  const [user, profile, org] = await Promise.all([getSessionUser(), getProfile(), getCurrentOrg()]);
  const sites = org ? await listSites(org.id) : [];
  const isBuyer = org?.market_role === "buyer";
  const isSeller = org?.market_role === "seller";
  const listings = org && isSeller ? await listMyListings(org.id) : [];
  const countOf = (status: string) => listings.filter((l) => l.status === status).length;
  const originSite = isBuyer ? sites[0] : undefined;
  const nearby = originSite ? await searchListings({ siteId: originSite.id, maxKm: 50 }) : [];
  const name = profile?.full_name || user?.email || "";

  return (
    <>
      <PageHeader
        title={t("dashboard.welcome", { name })}
        description={org ? `${org.name}${org.market_role ? ` · ${t(`roles.${org.market_role}`)}` : ""}` : undefined}
        actions={org ? <VerificationBadge status={org.verification_status} /> : undefined}
      />
      {org && <VerificationBanner org={org} />}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isBuyer ? (
                <Search className="size-5 text-primary" aria-hidden />
              ) : (
                <Store className="size-5 text-primary" aria-hidden />
              )}
              {isBuyer ? t("dashboard.buyerSearchTitle") : t("dashboard.sellerListingsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm text-muted-foreground">
              {isBuyer ? t("dashboard.buyerSearchBody") : t("dashboard.sellerListingsBody")}
            </p>
            {isSeller && (
              <>
                <p className="text-sm font-medium">
                  {t("dashboard.listingsCount", { active: countOf("active"), draft: countOf("draft") })}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href="/listings/new">
                      <Plus aria-hidden />
                      {t("dashboard.newListing")}
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/listings">{t("dashboard.manageListings")}</Link>
                  </Button>
                </div>
              </>
            )}
            {isBuyer && (
              <>
                {originSite && (
                  <p className="text-sm font-medium">
                    {t("dashboard.nearbyCount", { count: nearby.length, site: originSite.name })}
                  </p>
                )}
                <div>
                  <Button asChild>
                    <Link href="/search">
                      <Search aria-hidden />
                      {t("dashboard.openSearch")}
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-5 text-primary" aria-hidden />
                {t("dashboard.sitesTitle")}
              </CardTitle>
              <CardDescription>{t("dashboard.siteCount", { count: sites.length })}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {sites.length === 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {isBuyer ? t("dashboard.sitesBuyerEmpty") : t("dashboard.sitesSellerEmpty")}
                  </p>
                  <Button asChild>
                    <Link href="/sites/new">
                      <Plus aria-hidden />
                      {t("dashboard.addSite")}
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <ul className="grid gap-2 text-sm">
                    {sites.slice(0, 5).map((s) => (
                      <li key={s.id} className="flex justify-between gap-2">
                        <Link href={`/sites/${s.id}`} className="truncate hover:underline">
                          {s.name}
                        </Link>
                        <span className="shrink-0 text-muted-foreground">{s.municipality}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant="outline">
                    <Link href="/sites">{t("dashboard.manageSites")}</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="size-5 text-primary" aria-hidden />
                {t("dashboard.catalogTitle")}
              </CardTitle>
              <CardDescription>{t("dashboard.catalogBody")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/feedstocks">{t("dashboard.catalogLink")}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
