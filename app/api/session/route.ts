import { NextResponse } from "next/server";

import { acceptsPassword, sessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const submitted = form.get("password");

  if (typeof submitted !== "string" || !(await acceptsPassword(submitted))) {
    return new NextResponse(null, { headers: { location: "/login?error=1" }, status: 303 });
  }

  const response = new NextResponse(null, { headers: { location: "/" }, status: 303 });
  response.cookies.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
