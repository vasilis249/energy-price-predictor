import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage({ params }: PageProps<"/[locale]/forgot-password">) {
  setRequestLocale((await params).locale as Locale);
  const t = await getTranslations("auth.forgot");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
