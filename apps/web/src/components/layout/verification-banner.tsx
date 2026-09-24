import { getTranslations } from "next-intl/server";
import { Alert } from "@/components/ui/alert";
import type { CurrentOrg } from "@/server/auth";

export async function VerificationBanner({ org }: { org: CurrentOrg }) {
  const t = await getTranslations("verification");
  if (org.verification_status === "verified") return null;
  if (org.verification_status === "rejected") {
    return (
      <Alert variant="destructive" className="mb-6">
        {t("rejectedBanner", { note: org.verification_note ?? "—" })}
      </Alert>
    );
  }
  return (
    <Alert variant="warning" className="mb-6">
      {t("pendingBanner")}
    </Alert>
  );
}
