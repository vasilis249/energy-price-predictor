import { Factory, Plus } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCurrentOrg } from "@/server/auth";
import { listPlants } from "@/server/plants";

export async function generateMetadata({ params }: PageProps<"/[locale]/plants">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "plants" });
  return { title: t("title") };
}

const NOTICES = { created: "created", updated: "updated", deleted: "deleted" } as const;

export default async function PlantsPage({ params, searchParams }: PageProps<"/[locale]/plants">) {
  setRequestLocale((await params).locale as Locale);
  const { notice } = await searchParams;
  const t = await getTranslations("plants");
  const format = await getFormatter();
  const org = await getCurrentOrg();
  const plants = org ? await listPlants(org.id) : [];
  const noticeKey = typeof notice === "string" && notice in NOTICES ? NOTICES[notice as keyof typeof NOTICES] : null;

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Button asChild>
            <Link href="/plants/new">
              <Plus aria-hidden />
              {t("add")}
            </Link>
          </Button>
        }
      />
      {noticeKey && (
        <Alert variant="success" className="mb-4">
          {t(noticeKey)}
        </Alert>
      )}
      {plants.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Factory className="size-6" aria-hidden />
          </span>
          <p className="font-medium">{t("empty")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t("emptyHint")}</p>
          <Button asChild className="mt-2">
            <Link href="/plants/new">{t("add")}</Link>
          </Button>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plants.map((plant) => (
            <li key={plant.id}>
              <Link
                href={`/plants/${plant.id}`}
                className="block rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold">{plant.name}</h2>
                  <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    {t(`types.${plant.plant_type}`)}
                  </span>
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {format.number(plant.capacity_mw, { maximumFractionDigits: 3 })}{" "}
                  <span className="text-sm font-normal text-muted-foreground">MW</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(`schemes.${plant.support_scheme}`)}
                  {plant.location_name ? ` · ${plant.location_name}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
