import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "sidisiplin_session";
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:5000";

// User yang sesinya masih valid tidak perlu melihat halaman login lagi.
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.next();

  try {
    const response = await fetch(`${backendUrl}/api/auth/me`, {
      headers: { cookie: `${SESSION_COOKIE}=${token}` },
      cache: "no-store",
    });
    if (response.ok) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  } catch {
    // Backend tidak terjangkau: biarkan halaman login tampil.
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/login",
};
