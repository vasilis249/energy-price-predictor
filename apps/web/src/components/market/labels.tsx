import { useFormatter, useTranslations } from "next-intl";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type Enums = Database["public"]["Enums"];

/** "−€2,50 / m³ (seller pays)", "€3 / tonne", "Free". Shared by seller and buyer views. */
export function PriceLabel({
  price,
  unit,
  className,
}: {
  price: number;
  unit: Enums["quantity_unit"];
  className?: string;
}) {
  const t = useTranslations("listings");
  const format = useFormatter();
  const unitLabel = t(`units.${unit}`);
  const amount = format.number(Math.abs(price), { style: "currency", currency: "EUR" });
  const text =
    price > 0
      ? t("summary.priceBuyerPays", { amount, unit: unitLabel })
      : price < 0
        ? t("summary.priceGateFee", { amount, unit: unitLabel })
        : t("summary.priceFree");
  return <span className={cn(price < 0 && "text-primary", className)}>{text}</span>;
}

export function QuantityLabel({
  quantity,
  unit,
  period,
}: {
  quantity: number;
  unit: Enums["quantity_unit"];
  period: Enums["quantity_period"];
}) {
  const t = useTranslations("listings");
  const format = useFormatter();
  return (
    <>
      {t("summary.quantity", {
        quantity: format.number(quantity, { maximumFractionDigits: 2 }),
        unit: t(`units.${unit}`),
        period: t(`periods.${period}`),
      })}
    </>
  );
}

const statusStyles: Record<Enums["listing_status"], string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-success/15 text-success",
  paused: "bg-warning/20 text-warning-foreground",
  closed: "bg-secondary text-secondary-foreground",
};

export function ListingStatusBadge({ status }: { status: Enums["listing_status"] }) {
  const t = useTranslations("listings.status");
  return (
    <span className={cn("inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", statusStyles[status])}>
      {t(status)}
    </span>
  );
}
