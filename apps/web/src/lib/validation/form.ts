import { z } from "zod";

/**
 * Validation messages are i18n keys under `validation.*` in messages/{el,en}.json.
 * Field errors are returned as { field: key } so client components can translate them.
 */
export type FieldErrors = Record<string, string>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".") || "_form";
    out[field] ??= issue.message;
  }
  return out;
}

const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

/** Parse a decimal from a form value. Accepts Greek decimal commas ("1,5"). */
const parseDecimal = (v: unknown) => {
  const blank = blankToUndefined(v);
  if (typeof blank !== "string") return blank;
  const normalized = blank.trim().replace(/\s/g, "").replace(",", ".");
  return /^[-+]?\d*\.?\d+$/.test(normalized) ? Number(normalized) : Number.NaN;
};

const numberWithKeys = () => z.number({ error: (issue) => (issue.input === undefined ? "required" : "invalidNumber") });

export const decimal = (min: number, max: number, { exclusiveMin = false } = {}) =>
  z.preprocess(
    parseDecimal,
    (exclusiveMin ? numberWithKeys().gt(min, "outOfRange") : numberWithKeys().min(min, "outOfRange")).max(
      max,
      "outOfRange",
    ),
  );

export const optionalDecimal = (min: number, max: number, { exclusiveMin = false } = {}) =>
  z.preprocess(
    parseDecimal,
    (exclusiveMin ? numberWithKeys().gt(min, "outOfRange") : numberWithKeys().min(min, "outOfRange"))
      .max(max, "outOfRange")
      .optional(),
  );

export const integer = (min: number, max: number) =>
  z.preprocess(parseDecimal, numberWithKeys().int("invalidNumber").min(min, "outOfRange").max(max, "outOfRange"));

export const requiredText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string({ error: "required" }).min(1, "required").max(max, "tooLong"),
  );

export const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? blankToUndefined(v.trim()) : v),
    z.string().max(max, "tooLong").optional(),
  );

export function formDataToObject(formData: FormData): Record<string, FormDataEntryValue> {
  const out: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("$ACTION")) out[key] = value;
  }
  return out;
}
