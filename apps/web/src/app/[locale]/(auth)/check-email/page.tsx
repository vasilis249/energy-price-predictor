import { MailCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";

export default async function CheckEmailPage({ params }: PageProps<"/[locale]/check-email">) {
  setRequestLocale((await params).locale as Locale);
  const t = await getTranslations("auth.checkEmail");
  return (
    <Card className="text-center">
      <CardHeader className="items-center">
        <span className="mb-2 grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
        <CardDescription className="text-base">{t("body")}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{t("hint")}</p>
      </CardContent>
    </Card>
  );
}
