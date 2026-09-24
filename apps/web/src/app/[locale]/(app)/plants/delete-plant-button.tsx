"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deletePlantAction } from "./actions";

export function DeletePlantButton({ id, name }: { id: string; name: string }) {
  const t = useTranslations("plants");
  const tc = useTranslations("common");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <Trash2 aria-hidden />
          {tc("delete")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
        <DialogDescription>{t("deleteConfirmBody", { name })}</DialogDescription>
        <form action={deletePlantAction} className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <input type="hidden" name="id" value={id} />
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {tc("cancel")}
            </Button>
          </DialogClose>
          <Button type="submit" variant="destructive">
            {tc("delete")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
