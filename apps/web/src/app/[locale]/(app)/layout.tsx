import { SiteFooter } from "@/components/layout/site-footer";
import { AppNav } from "@/components/layout/app-nav";
import { Logo } from "@/components/layout/logo";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCurrentOrg, isPlatformAdmin, needsOnboarding, requireUser } from "@/server/auth";

export default async function AppLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = (await params).locale as Locale;
  const user = await requireUser(locale);
  const [org, admin] = await Promise.all([getCurrentOrg(), isPlatformAdmin()]);
  // Everyone picks a role and enters company details before using the marketplace.
  if (needsOnboarding(org) && !admin) return redirect({ href: "/onboarding", locale });
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          <Logo href="/dashboard" />
          <AppNav email={user.email} isAdmin={admin} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
