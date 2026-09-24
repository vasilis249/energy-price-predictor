import { ArrowRight, Factory, Handshake, ListPlus, Tractor, Truck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  setRequestLocale((await params).locale as Locale);
  const t = await getTranslations("home");

  const audiences = [
    { icon: Tractor, title: t("sellersTitle"), body: t("sellersBody"), cta: t("ctaSeller"), role: "seller" },
    { icon: Factory, title: t("buyersTitle"), body: t("buyersBody"), cta: t("ctaBuyer"), role: "buyer" },
  ] as const;
  const steps = [
    { icon: ListPlus, title: t("how1Title"), body: t("how1Body") },
    { icon: Handshake, title: t("how2Title"), body: t("how2Body") },
    { icon: Truck, title: t("how3Title"), body: t("how3Body") },
  ];

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-12 sm:px-6 sm:pt-20">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">{t("title")}</h1>
          <p className="mt-4 text-lg text-muted-foreground text-pretty sm:text-xl">{t("subtitle")}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={{ pathname: "/signup", query: { role: "seller" } }}>{t("ctaSeller")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={{ pathname: "/signup", query: { role: "buyer" } }}>{t("ctaBuyer")}</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm">
            <Link href="/login" className="text-primary hover:underline">
              {t("ctaLogin")}
            </Link>
          </p>
          <LanguageSwitcher className="mt-6 sm:hidden" />
        </div>
      </section>

      <section className="border-t bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-2">
          {audiences.map(({ icon: Icon, title, body, cta, role }) => (
            <div key={role} className="flex flex-col rounded-xl border bg-card p-6 shadow-sm">
              <span className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-xl font-semibold">{title}</h2>
              <p className="mt-2 flex-1 text-muted-foreground">{body}</p>
              <Link
                href={{ pathname: "/signup", query: { role } }}
                className="mt-4 inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                {cta}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight">{t("howTitle")}</h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <Icon className="size-6 text-primary" aria-hidden />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
        <Link
          href="/feedstocks"
          className="mt-8 inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          {t("catalogLink")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>
    </>
  );
}
