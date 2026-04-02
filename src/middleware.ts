import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isManagerRoute = pathname.startsWith("/manager");
  const isAdminRoute = pathname.startsWith("/admin");
  const isEmployeeRoute = pathname.startsWith("/employee");

  if (!session?.user) {
    if (isManagerRoute || isAdminRoute || isEmployeeRoute) {
      const login = new URL("/login", req.url);
      login.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  const role = session.user.role;

  if (isAdminRoute && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/employee", req.url));
  }

  if (isManagerRoute && role !== "MANAGER" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/employee", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/employee/:path*", "/manager/:path*", "/admin/:path*"],
};
