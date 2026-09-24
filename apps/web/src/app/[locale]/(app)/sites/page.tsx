import { MapPin, Plus } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCurrentOrg } from "@/server/auth";
import { listSites } from "@/server/sites";

export async function generateMetadata({ params }: PageProps<"/[locale]/sites">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "sites" });
  return { title: t("title") };
}

const NOTICES = { created: "created", updated: "updated", deleted: "deleted", inUse: "inUse" } as const;

export default async function SitesPage({ params, searchParams }: PageProps<"/[locale]/sites">) {
  setRequestLocale((await params).locale as Locale);
  const { notice } = await searchParams;
  const t = await getTranslations();
  const org = await getCurrentOrg();
  const sites = org ? await listSites(org.id) : [];
  const noticeKey = typeof notice === "string" && notice in NOTICES ? NOTICES[notice as keyof typeof NOTICES] : null;
  const emptyText = org?.market_role === "buyer" ? t("dashboard.sitesBuyerEmpty") : t("dashboard.sitesSellerEmpty");

  return (
    <>
      <PageHeader
        title={t("sites.title")}
        description={t("sites.subtitle")}
        actions={
          <Button asChild>
            <Link href="/sites/new">
              <Plus aria-hidden />
              {t("sites.add")}
            </Link>
          </Button>
        }
      />
      {noticeKey && (
        <Alert variant={noticeKey === "inUse" ? "destructive" : "success"} className="mb-4">
          {t(`sites.${noticeKey}`)}
        </Alert>
      )}
      {sites.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <MapPin className="size-6" aria-hidden />
          </span>
          <p className="font-medium">{t("sites.empty")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{emptyText}</p>
          <Button asChild className="mt-2">
            <Link href="/sites/new">{t("sites.add")}</Link>
          </Button>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <li key={site.id}>
              <Link
                href={`/sites/${site.id}`}
                className="block rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold">{site.name}</h2>
                  <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    {t(`sites.types.${site.site_type}`)}
                  </span>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-4" aria-hidden />
                  {site.municipality || `${site.latitude}, ${site.longitude}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
