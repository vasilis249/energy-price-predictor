"use client";

import { Pause, Play, Send, Trash2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormMessage } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Database } from "@/lib/supabase/database.types";
import { deleteListingAction, setListingStatusAction } from "./actions";

type Status = Database["public"]["Enums"]["listing_status"];

function StatusButton({
  id,
  to,
  children,
  variant,
}: {
  id: string;
  to: "active" | "paused" | "closed";
  children: React.ReactNode;
  variant?: "default" | "outline" | "destructive";
}) {
  const { state, pending, onSubmit } = useFormAction(setListingStatusAction);
  return (
    <form onSubmit={onSubmit} className="grid gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={to} />
      <FormMessage messageKey={state.status === "error" ? state.formError : undefined} variant="error" />
      <SubmitButton pending={pending} variant={variant} className="w-full sm:w-auto">
        {children}
      </SubmitButton>
    </form>
  );
}

export function StatusActions({ id, status, canPublish }: { id: string; status: Status; canPublish: boolean }) {
  const t = useTranslations("listings");
  const tc = useTranslations("common");
  if (status === "closed") return null;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start">
      {status === "draft" && canPublish && (
        <StatusButton id={id} to="active">
          <Send aria-hidden />
          {t("actions.publish")}
        </StatusButton>
      )}
      {status === "active" && (
        <StatusButton id={id} to="paused" variant="outline">
          <Pause aria-hidden />
          {t("actions.pause")}
        </StatusButton>
      )}
      {status === "paused" && canPublish && (
        <StatusButton id={id} to="active">
          <Play aria-hidden />
          {t("actions.resume")}
        </StatusButton>
      )}
      {status === "draft" ? (
        <form action={deleteListingAction}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="outline" className="w-full text-destructive hover:text-destructive sm:w-auto">
            <Trash2 aria-hidden />
            {tc("delete")}
          </Button>
        </form>
      ) : (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full text-destructive hover:text-destructive sm:w-auto">
              <XCircle aria-hidden />
              {t("actions.close")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>{t("actions.closeConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("actions.closeConfirmBody")}</DialogDescription>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {tc("cancel")}
                </Button>
              </DialogClose>
              <StatusButton id={id} to="closed" variant="destructive">
                {t("actions.close")}
              </StatusButton>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
