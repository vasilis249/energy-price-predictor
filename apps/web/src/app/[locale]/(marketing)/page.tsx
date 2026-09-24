import { BarChart3, CalendarClock, Gauge } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  setRequestLocale((await params).locale as Locale);
  const t = await getTranslations("home");

  const features = [
    { icon: CalendarClock, title: t("feature1Title"), body: t("feature1Body") },
    { icon: BarChart3, title: t("feature2Title"), body: t("feature2Body") },
    { icon: Gauge, title: t("feature3Title"), body: t("feature3Body") },
  ];

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-12 sm:px-6 sm:pt-20">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">{t("title")}</h1>
          <p className="mt-4 text-lg text-muted-foreground text-pretty sm:text-xl">{t("subtitle")}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">{t("ctaPrimary")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">{t("ctaSecondary")}</Link>
            </Button>
          </div>
          <LanguageSwitcher className="mt-6 sm:hidden" />
        </div>
      </section>
      <section className="border-t bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:grid-cols-3 sm:px-6">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border bg-card p-5 shadow-sm">
              <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
