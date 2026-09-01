import { NextRequest, NextResponse } from "next/server";

import { acceptsSession, SESSION_COOKIE } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (await acceptsSession(session)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!api/session|login|_next/static|_next/image|favicon.ico).*)"],
};
