import { Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Logo({ href = "/" }: { href?: "/" | "/dashboard" }) {
  const t = useTranslations("common");
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Zap className="size-4" aria-hidden />
      </span>
      <span className="text-base">{t("appName")}</span>
    </Link>
  );
}
