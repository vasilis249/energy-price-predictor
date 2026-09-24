import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/layout/page-header";
import type { Locale } from "@/i18n/routing";
import { getPlant } from "@/server/plants";
import { DeletePlantButton } from "../delete-plant-button";
import { PlantForm } from "../plant-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/plants/[id]">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "plants" });
  return { title: t("editTitle") };
}

export default async function EditPlantPage({ params }: PageProps<"/[locale]/plants/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  if (!z.uuid().safeParse(id).success) notFound();
  // RLS returns null for plants of other organizations, which we treat as not found.
  const plant = await getPlant(id);
  if (!plant) notFound();
  const t = await getTranslations("plants");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t("editTitle")}
        description={plant.name}
        actions={<DeletePlantButton id={plant.id} name={plant.name} />}
      />
      <PlantForm plant={plant} />
    </div>
  );
}
