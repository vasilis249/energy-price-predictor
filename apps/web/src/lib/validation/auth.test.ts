import { describe, expect, it } from "vitest";
import { toFieldErrors } from "./form";
import { resetPasswordSchema, safeNextPath, signupSchema } from "./auth";

describe("signupSchema", () => {
  const valid = {
    marketRole: "seller",
    fullName: "Μαρία Παπαδοπούλου",
    email: " Maria@Example.GR ",
    password: "Str0ngPassw0rd",
    acceptTerms: "on",
  };

  it("normalizes email and accepts a strong password", () => {
    const result = signupSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("maria@example.gr");
    expect(result.data?.orgName).toBeUndefined();
  });

  it("rejects weak passwords and missing terms acceptance", () => {
    const result = signupSchema.safeParse({ ...valid, password: "alllowercase1", acceptTerms: undefined });
    expect(result.success).toBe(false);
    expect(toFieldErrors(result.error!)).toEqual({ password: "passwordTooWeak", acceptTerms: "mustAcceptTerms" });
  });

  it("rejects invalid email", () => {
    const result = signupSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(toFieldErrors(result.error!)).toEqual({ email: "invalidEmail" });
  });
});

describe("resetPasswordSchema", () => {
  it("requires matching passwords", () => {
    const result = resetPasswordSchema.safeParse({ password: "Str0ngPassw0rd", confirmPassword: "Different1Pass" });
    expect(toFieldErrors(result.error!)).toEqual({ confirmPassword: "passwordsDontMatch" });
  });
});

describe("safeNextPath", () => {
  it.each([
    ["/plants", "/plants"],
    ["https://evil.example", "/dashboard"],
    ["//evil.example", "/dashboard"],
    ["/\\evil.example", "/dashboard"],
    [undefined, "/dashboard"],
  ])("%s -> %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});
