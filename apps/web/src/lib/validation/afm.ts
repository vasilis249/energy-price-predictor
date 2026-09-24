/**
 * Greek VAT number (ΑΦΜ): 9 digits whose last digit is a check digit.
 * Same algorithm as public.is_valid_afm() in the database.
 */
export function isValidAfm(afm: string): boolean {
  if (!/^\d{9}$/.test(afm) || afm === "000000000") return false;
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(afm[i]) * 2 ** (8 - i);
  return (sum % 11) % 10 === Number(afm[8]);
}

/** Accept common ways people type it: spaces, dots, an "EL"/"GR" VAT prefix. */
export function normalizeAfm(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/^(EL|GR)/, "")
    .replace(/[\s.\-]/g, "");
}
