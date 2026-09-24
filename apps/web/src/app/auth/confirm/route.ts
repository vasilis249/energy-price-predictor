import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { localeFrom, localizedUrl } from "../localized-url";

const OTP_TYPES: EmailOtpType[] = ["signup", "email", "recovery", "invite", "magiclink", "email_change"];

/** Target of the links in our email templates (supabase/templates/*.html): verifies the token hash. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const locale = localeFrom(params.get("locale"));
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const next = type === "recovery" ? "/reset-password" : "/dashboard";
      return NextResponse.redirect(localizedUrl(request, locale, next));
    }
  }
  return NextResponse.redirect(localizedUrl(request, locale, "/login", { error: "linkInvalid" }));
}
