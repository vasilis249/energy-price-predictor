import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Logo } from "@/components/layout/logo";
import { SiteFooter } from "@/components/layout/site-footer";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/server/auth";

export default async function OnboardingLayout({ children, params }: LayoutProps<"/[locale]">) {
  await requireUser((await params).locale as Locale);
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <LanguageSwitcher />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-6 sm:py-12">
        <div className="w-full max-w-lg">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
