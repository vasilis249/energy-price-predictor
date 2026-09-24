"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Field, fieldProps, FormMessage } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setVerification } from "./actions";

export function VerificationActions({ orgId, canVerify }: { orgId: string; canVerify: boolean }) {
  const t = useTranslations("admin");
  const verify = useFormAction(setVerification);
  const reject = useFormAction(setVerification);
  const [rejecting, setRejecting] = useState(false);
  const done = verify.state.status === "success" || reject.state.status === "success";

  if (done) return <FormMessage messageKey="admin.updated" variant="success" />;
  return (
    <div className="grid gap-2">
      <FormMessage messageKey={verify.state.status === "error" ? verify.state.formError : undefined} variant="error" />
      {!rejecting ? (
        <div className="flex flex-wrap gap-2">
          <form onSubmit={verify.onSubmit}>
            <input type="hidden" name="orgId" value={orgId} />
            <input type="hidden" name="status" value="verified" />
            <SubmitButton pending={verify.pending} size="sm" disabled={!canVerify}>
              {t("verify")}
            </SubmitButton>
          </form>
          <Button type="button" size="sm" variant="outline" onClick={() => setRejecting(true)}>
            {t("reject")}
          </Button>
        </div>
      ) : (
        <form onSubmit={reject.onSubmit} noValidate className="grid gap-2">
          <input type="hidden" name="orgId" value={orgId} />
          <input type="hidden" name="status" value="rejected" />
          <Field name="note" label={t("rejectNote")} error={reject.fieldErrors.note}>
            <Input
              {...fieldProps("note", reject.fieldErrors.note)}
              placeholder={t("notePlaceholder")}
              maxLength={1000}
            />
          </Field>
          <div className="flex gap-2">
            <SubmitButton pending={reject.pending} size="sm" variant="destructive">
              {t("reject")}
            </SubmitButton>
            <Button type="button" size="sm" variant="ghost" onClick={() => setRejecting(false)}>
              ✕
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
