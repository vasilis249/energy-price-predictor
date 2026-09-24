import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { refreshSession } from "@/lib/supabase/proxy";

const handleI18nRouting = createIntlMiddleware(routing);

// Path (without locale prefix) prefixes that need a signed-in user. This is only an optimistic
// redirect; every protected page and action verifies the session again on the server.
const PROTECTED = ["/dashboard", "/sites", "/settings", "/onboarding", "/admin"];
const AUTH_PAGES = ["/login", "/signup"];

function stripLocale(pathname: string): { locale: string; path: string } {
  const [, first, ...rest] = pathname.split("/");
  if ((routing.locales as readonly string[]).includes(first)) {
    return { locale: first, path: "/" + rest.join("/") };
  }
  return { locale: routing.defaultLocale, path: pathname };
}

function localized(locale: string, path: string) {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}

export async function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);
  const userId = await refreshSession(request, response);

  const { locale, path } = stripLocale(request.nextUrl.pathname);
  const matches = (prefixes: string[]) => prefixes.some((p) => path === p || path.startsWith(`${p}/`));

  if (!userId && matches(PROTECTED)) {
    const url = request.nextUrl.clone();
    url.pathname = localized(locale, "/login");
    url.search = `?next=${encodeURIComponent(path)}`;
    return withCookies(NextResponse.redirect(url), response);
  }
  if (userId && matches(AUTH_PAGES)) {
    const url = request.nextUrl.clone();
    url.pathname = localized(locale, "/dashboard");
    url.search = "";
    return withCookies(NextResponse.redirect(url), response);
  }
  return response;
}

function withCookies(target: NextResponse, source: NextResponse) {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie);
  return target;
}

export const config = {
  // Everything except API/auth route handlers, Next internals and files with an extension.
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
