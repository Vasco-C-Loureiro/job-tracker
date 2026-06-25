import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  // API routes handle their own auth via Bearer token — never redirect them
  if (request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Start with a pass-through response that carries the original request.
  // All cookie mutations must land on this exact object — never create a fresh
  // NextResponse.next() and return it, or the Set-Cookie headers are lost.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 1. Write into the request so the updated session is visible to any
          //    server-side code that runs after this proxy in the same req.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // 2. Rebuild supabaseResponse with the now-mutated request so Next.js
          //    propagates the cookies to the browser via Set-Cookie headers.
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() validates the JWT with Supabase's server — do not use getSession(),
  // which trusts the cookie without a server round-trip and can be spoofed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isPublicPath =
    pathname === "/" ||
    pathname === "/home" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/auth/");

  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on every path except Next.js static assets and common image types.
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
