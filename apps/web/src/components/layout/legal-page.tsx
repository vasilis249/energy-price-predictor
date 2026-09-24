import { getFormatter, getTranslations } from "next-intl/server";
import { legalContent, type LegalDoc } from "@/content/legal";
import type { Locale } from "@/i18n/routing";
import { publicEnv } from "@/lib/env";

export async function LegalPage({ doc, locale }: { doc: LegalDoc; locale: Locale }) {
  const t = await getTranslations("legal");
  const format = await getFormatter();
  const content = legalContent[locale][doc];
  const fill = (text: string) => text.replaceAll("{contact}", publicEnv.NEXT_PUBLIC_CONTACT_EMAIL);

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight">{content.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("lastUpdated", { date: format.dateTime(new Date(content.updated), { dateStyle: "long" }) })}
      </p>
      <p className="mt-4 rounded-lg border border-warning/50 bg-warning/15 px-4 py-2 text-sm">{t("draftNotice")}</p>
      {content.sections.map((section) => (
        <section key={section.heading} className="mt-8">
          <h2 className="text-xl font-semibold">{section.heading}</h2>
          {section.paragraphs.map((p) => (
            <p key={p} className="mt-3 leading-relaxed text-foreground/90">
              {fill(p)}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}

export function legalMetadata(doc: LegalDoc) {
  return async ({ params }: { params: Promise<{ locale: string }> }) => ({
    title: legalContent[(await params).locale as Locale][doc].title,
  });
}
