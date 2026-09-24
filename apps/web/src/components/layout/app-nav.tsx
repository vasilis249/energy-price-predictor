"use client";

import { Factory, LayoutDashboard, LogOut, Menu, Settings, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "./language-switcher";

const items = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/plants", key: "plants", icon: Factory },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

function NavLinks({ onNavigate, vertical }: { onNavigate?: () => void; vertical?: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <>
      {items.map(({ href, key, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              vertical && "py-3 text-base",
              active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {t(key)}
          </Link>
        );
      })}
    </>
  );
}

function SignOutButton({ className }: { className?: string }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  return (
    <form action={`/auth/signout?locale=${locale}`} method="post" className={className}>
      <Button type="submit" variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
        <LogOut aria-hidden />
        {t("signOut")}
      </Button>
    </form>
  );
}

export function AppNav({ email }: { email: string | null }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav aria-label={t("mainNavigation")} className="hidden items-center gap-1 md:flex">
        <NavLinks />
      </nav>
      <div className="hidden items-center gap-3 md:flex">
        <LanguageSwitcher />
        <SignOutButton />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("openMenu")}>
            <Menu className="size-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="top-0 left-0 w-full max-w-none translate-x-0 translate-y-0 rounded-none rounded-b-xl p-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">{t("mainNavigation")}</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" aria-label={t("closeMenu")}>
                <X className="size-5" />
              </Button>
            </DialogClose>
          </div>
          {email && <p className="truncate text-sm text-muted-foreground">{email}</p>}
          <nav aria-label={t("mainNavigation")} className="grid gap-1">
            <NavLinks vertical onNavigate={() => setOpen(false)} />
          </nav>
          <div className="flex items-center justify-between border-t pt-3">
            <LanguageSwitcher />
            <SignOutButton />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
