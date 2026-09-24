import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/server/auth";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({ params }: PageProps<"/[locale]/reset-password">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  // The recovery link (/auth/confirm?type=recovery) signs the user in before landing here.
  await requireUser(locale);
  const t = await getTranslations("auth.reset");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}
