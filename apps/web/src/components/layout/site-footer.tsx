import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function SiteFooter() {
  const t = useTranslations();
  return (
    <footer className="border-t bg-card/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:px-6">
        <p>{t("footer.disclaimerShort")}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span>{t("footer.rights", { year: new Date().getFullYear(), appName: t("common.appName") })}</span>
          <nav className="flex flex-wrap gap-x-4 gap-y-2">
            <Link href="/privacy" className="hover:text-foreground hover:underline">
              {t("footer.privacy")}
            </Link>
            <Link href="/terms" className="hover:text-foreground hover:underline">
              {t("footer.terms")}
            </Link>
            <Link href="/disclaimer" className="hover:text-foreground hover:underline">
              {t("footer.disclaimer")}
            </Link>
            <Link href="/cookies" className="hover:text-foreground hover:underline">
              {t("footer.cookies")}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
