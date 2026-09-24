import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { VerificationBadge } from "@/components/layout/status-badge";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { listOrganizations } from "@/server/admin";
import { VerificationActions } from "./verification-actions";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin">): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale as Locale, namespace: "admin" });
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminPage({ params, searchParams }: PageProps<"/[locale]/admin">) {
  setRequestLocale((await params).locale as Locale);
  const filter = (await searchParams).filter === "all" ? "all" : "pending";
  const orgs = await listOrganizations(filter); // 404 for non-admins
  const t = await getTranslations();
  const format = await getFormatter();

  return (
    <>
      <PageHeader title={t("admin.orgsTitle")} description={t("admin.title")} />
      <nav className="mb-4 flex gap-2" aria-label={t("admin.orgsTitle")}>
        {(["pending", "all"] as const).map((f) => (
          <Link
            key={f}
            href={{ pathname: "/admin", query: { filter: f } }}
            aria-current={filter === f ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              filter === f ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground",
            )}
          >
            {f === "pending" ? t("admin.filterPending") : t("admin.filterAll")}
          </Link>
        ))}
      </nav>
      {orgs.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">{t("admin.empty")}</Card>
      ) : (
        <ul className="grid gap-3">
          {orgs.map((org) => {
            const complete = Boolean(org.market_role && org.legal_name && org.vat_number && org.phone);
            return (
              <li key={org.id}>
                <Card className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-start">
                  <div className="grid gap-1.5 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold">{org.legal_name || org.name}</h2>
                      <VerificationBadge status={org.verification_status} />
                      {!complete && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{t("admin.incomplete")}</span>
                      )}
                    </div>
                    <p className="text-muted-foreground">
                      {org.market_role ? t(`roles.${org.market_role}`) : "—"} · {org.name}
                    </p>
                    <p>
                      {t("onboarding.vatNumber")}: <span className="font-mono">{org.vat_number ?? "—"}</span> ·{" "}
                      {t("onboarding.phone")}: {org.phone ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.registered", {
                        date: format.dateTime(new Date(org.created_at), { dateStyle: "medium" }),
                      })}
                      {org.verification_note ? ` · ${org.verification_note}` : ""}
                    </p>
                  </div>
                  {org.verification_status !== "verified" && (
                    <VerificationActions orgId={org.id} canVerify={complete} />
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
