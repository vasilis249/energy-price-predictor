import { z } from "zod";
import { locales } from "@/i18n/routing";
import { requiredText } from "./form";

export const profileSchema = z.object({
  fullName: requiredText(120),
  locale: z.enum(locales, { error: "required" }),
});
