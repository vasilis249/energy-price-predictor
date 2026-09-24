import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";
import { publicEnv } from "@/lib/env";
import { getCurrentOrg, getProfile, getSessionUser } from "@/server/auth";
import { OrganizationForm, ProfileForm } from "./settings-forms";

export async function generateMetadata({ params }: PageProps<"/[locale]/settings">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "settings" });
  return { title: t("title") };
}

export default async function SettingsPage({ params, searchParams }: PageProps<"/[locale]/settings">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const { saved } = await searchParams;
  const t = await getTranslations();
  const [user, profile, org] = await Promise.all([getSessionUser(), getProfile(), getCurrentOrg()]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("settings.title")} />
      {saved && (
        <Alert variant="success" className="mb-4">
          {t("common.saved")}
        </Alert>
      )}
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.profileTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm fullName={profile?.full_name ?? ""} locale={profile?.locale ?? locale} />
          </CardContent>
        </Card>
        {org && (
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.orgTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <OrganizationForm name={org.name} canEdit={org.role === "owner"} />
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.accountTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <p>{t("settings.accountEmail", { email: user?.email ?? "" })}</p>
            <p className="text-muted-foreground">
              {t("settings.dataRights", { email: publicEnv.NEXT_PUBLIC_CONTACT_EMAIL })}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
