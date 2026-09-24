import { LineChart, Plus } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCurrentOrg, getProfile, getSessionUser } from "@/server/auth";
import { listPlants } from "@/server/plants";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "dashboard" });
  return { title: t("title") };
}

export default async function DashboardPage({ params }: PageProps<"/[locale]/dashboard">) {
  setRequestLocale((await params).locale as Locale);
  const t = await getTranslations("dashboard");
  const format = await getFormatter();
  const [user, profile, org] = await Promise.all([getSessionUser(), getProfile(), getCurrentOrg()]);
  const plants = org ? await listPlants(org.id) : [];
  const totalMw = plants.reduce((sum, p) => sum + Number(p.capacity_mw), 0);
  const name = profile?.full_name || user?.email || "";

  return (
    <>
      <PageHeader title={t("welcome", { name })} description={org?.name} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("forecastTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/40 p-6 text-center">
              <LineChart className="size-8 text-muted-foreground" aria-hidden />
              <p className="max-w-md text-sm text-muted-foreground">{t("forecastComingSoon")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("plantsTitle")}</CardTitle>
            <CardDescription>
              {t("plantCount", {
                count: plants.length,
                capacity: format.number(totalMw, { maximumFractionDigits: 3 }),
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {plants.length === 0 ? (
              <div className="grid gap-3">
                <p className="text-sm text-muted-foreground">{t("noPlants")}</p>
                <Button asChild>
                  <Link href="/plants/new">
                    <Plus aria-hidden />
                    {t("addFirstPlant")}
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                <ul className="grid gap-2 text-sm">
                  {plants.slice(0, 5).map((p) => (
                    <li key={p.id} className="flex justify-between gap-2">
                      <Link href={`/plants/${p.id}`} className="truncate hover:underline">
                        {p.name}
                      </Link>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {format.number(p.capacity_mw, { maximumFractionDigits: 3 })} MW
                      </span>
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline">
                  <Link href="/plants">{t("managePlants")}</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
