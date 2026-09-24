import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const styles = {
  pending: "bg-warning/20 text-warning-foreground",
  verified: "bg-success/15 text-success",
  rejected: "bg-destructive/10 text-destructive",
} as const;

export function VerificationBadge({ status }: { status: keyof typeof styles }) {
  const t = useTranslations("verification");
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", styles[status])}>{t(status)}</span>
  );
}
