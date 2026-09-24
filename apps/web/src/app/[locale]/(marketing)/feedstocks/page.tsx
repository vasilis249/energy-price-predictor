import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Alert } from "@/components/ui/alert";
import type { Locale } from "@/i18n/routing";
import { listFeedstockTypes, type FeedstockType } from "@/server/feedstocks";

export async function generateMetadata({ params }: PageProps<"/[locale]/feedstocks">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "catalog" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function FeedstocksPage({ params }: PageProps<"/[locale]/feedstocks">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");
  const format = await getFormatter();
  const types = await listFeedstockTypes();
  const groups = new Map<FeedstockType["category"], FeedstockType[]>();
  for (const type of types) groups.set(type.category, [...(groups.get(type.category) ?? []), type]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      <Alert className="mt-4">{t("disclaimer")}</Alert>
      {[...groups.entries()].map(([category, items]) => (
        <section key={category} className="mt-10">
          <h2 className="text-xl font-semibold">{t(`categories.${category}`)}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((f) => (
              <li key={f.code} className="rounded-xl border bg-card p-4 shadow-sm">
                <h3 className="font-medium">{locale === "el" ? f.name_el : f.name_en}</h3>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {f.typical_biogas_m3_per_t !== null && (
                    <div>
                      <dt className="text-muted-foreground">{t("biogas")}</dt>
                      <dd className="font-semibold tabular-nums">
                        ~{format.number(f.typical_biogas_m3_per_t)}{" "}
                        <span className="font-normal text-muted-foreground">
                          {t("perUnit", { unit: t(`units.${f.default_unit}`) })}
                        </span>
                      </dd>
                    </div>
                  )}
                  {f.typical_dm_pct !== null && (
                    <div>
                      <dt className="text-muted-foreground">{t("dm")}</dt>
                      <dd className="font-semibold tabular-nums">~{format.number(f.typical_dm_pct)}%</dd>
                    </div>
                  )}
                </dl>
                <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                  {f.ewc_code && (
                    <span className="rounded-full bg-secondary px-2 py-0.5">
                      {t("ewc")} {f.ewc_code}
                    </span>
                  )}
                  {f.is_animal_by_product && f.abp_category && (
                    <span className="rounded-full bg-warning/20 px-2 py-0.5">
                      {t("abp", { category: f.abp_category })}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
