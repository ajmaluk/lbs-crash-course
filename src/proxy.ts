import { NextResponse, NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("__session")?.value;

  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.includes("/(student)");

  const isPublicPath = pathname === "/login" || pathname === "/register";

  if (isProtectedRoute && !session && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin")) {
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    const role = request.cookies.get("__role")?.value;
    if (role !== "admin") {
      console.warn(`[MIDDLEWARE_BLOCK] Non-admin attempt to ${pathname}`);
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}



export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};