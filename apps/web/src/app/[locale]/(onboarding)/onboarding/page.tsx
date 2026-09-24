import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCurrentOrg, needsOnboarding } from "@/server/auth";
import { OnboardingForm } from "./onboarding-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/onboarding">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "onboarding" });
  return { title: t("title") };
}

export default async function OnboardingPage({ params }: PageProps<"/[locale]/onboarding">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const org = await getCurrentOrg();
  if (!needsOnboarding(org)) return redirect({ href: "/dashboard", locale });
  const t = await getTranslations("onboarding");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <OnboardingForm
          defaults={{
            marketRole: org?.market_role ?? null,
            legalName: org?.legal_name ?? "",
            vatNumber: org?.vat_number ?? "",
            phone: org?.phone ?? "",
          }}
        />
      </CardContent>
    </Card>
  );
}
