import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import type { Locale } from "@/i18n/routing";
import { PlantForm } from "../plant-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/plants/new">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "plants" });
  return { title: t("newTitle") };
}

export default async function NewPlantPage({ params }: PageProps<"/[locale]/plants/new">) {
  setRequestLocale((await params).locale as Locale);
  const t = await getTranslations("plants");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("newTitle")} />
      <PlantForm />
    </div>
  );
}
