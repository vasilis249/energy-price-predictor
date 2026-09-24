import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/validation/auth";
import { localeFrom, localizedUrl } from "../localized-url";

/** OAuth (Google) and PKCE email-link callback: exchanges the code for a session. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const locale = localeFrom(params.get("locale"));
  const code = params.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(localizedUrl(request, locale, safeNextPath(params.get("next"))));
    }
  }
  return NextResponse.redirect(localizedUrl(request, locale, "/login", { error: "linkInvalid" }));
}
