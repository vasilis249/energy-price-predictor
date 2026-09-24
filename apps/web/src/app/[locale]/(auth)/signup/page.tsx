import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GoogleButton } from "@/components/forms/google-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";
import { SignupForm } from "./signup-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/signup">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "auth.signup" });
  return { title: t("title") };
}

export default async function SignupPage({ params, searchParams }: PageProps<"/[locale]/signup">) {
  setRequestLocale((await params).locale as Locale);
  const { role } = await searchParams;
  const t = await getTranslations("auth.signup");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <GoogleButton />
        <SignupForm role={role === "buyer" || role === "seller" ? role : undefined} />
      </CardContent>
    </Card>
  );
}
