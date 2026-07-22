import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    process.env.FLASHCARDS_ONLY_MODE !== "false" &&
    ["/dashboard", "/practice", "/book", "/mocks", "/progress", "/badges", "/onboarding"].some((route) => pathname === route || pathname.startsWith(`${route}/`))
  ) {
    return NextResponse.redirect(new URL("/flashcards", request.url));
  }

  // Allow Next internals and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    pathname.startsWith("/manifest.webmanifest") ||
    pathname.startsWith("/icons")
  ) {
    return NextResponse.next();
  }

  // Do not run Supabase/auth/env/AI logic in middleware.
  // Auth protection will be handled in route layouts/pages instead.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)"],
};
