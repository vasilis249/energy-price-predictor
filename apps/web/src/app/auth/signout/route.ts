import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { localeFrom, localizedUrl } from "../localized-url";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const locale = localeFrom(request.nextUrl.searchParams.get("locale"));
  // 303 so the browser follows with GET after the form POST.
  return NextResponse.redirect(localizedUrl(request, locale, "/"), { status: 303 });
}
