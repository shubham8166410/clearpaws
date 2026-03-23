import { createServerClient } from "@supabase/ssr";
import { NextResponse, NextRequest } from "next/server";

/**
 * Copies any Set-Cookie headers produced by the session refresh into a
 * rewrite/redirect response so token renewal works on subdomain routes too.
 */
function forwardSessionCookies(target: NextResponse, source: NextResponse): NextResponse {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
  return target;
}

/**
 * Refreshes the Supabase session cookie on every request.
 * Must be called from the root proxy.ts.
 */
export async function updateSession(request: NextRequest) {
  // Strip x-agency-slug from all incoming requests so callers cannot forge it.
  // The middleware is the only place that sets this header — always from a
  // validated agency lookup, never from user-supplied input.
  if (request.headers.get("x-agency-slug")) {
    const stripped = new Headers(request.headers);
    stripped.delete("x-agency-slug");
    request = new NextRequest(request.url, { headers: stripped, method: request.method, body: request.body });
  }

  // ── Session refresh ────────────────────────────────────────────────────────
  // Must happen on EVERY request — including subdomain rewrites — or Supabase
  // tokens expire without renewal and users are intermittently logged out.
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — do not remove this line.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Subdomain routing ──────────────────────────────────────────────────────
  const hostname = request.headers.get("host") ?? "";
  const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "petborder.com";

  const isLocalOrPreview =
    hostname.includes("localhost") ||
    hostname.includes("127.0.0.1") ||
    hostname.includes("vercel.app");

  if (!isLocalOrPreview && hostname.endsWith(`.${BASE_DOMAIN}`)) {
    const subdomain = hostname.slice(0, hostname.length - BASE_DOMAIN.length - 1);

    if (subdomain === "agency") {
      const url = request.nextUrl.clone();
      url.pathname = `/agency-portal${request.nextUrl.pathname}`;
      return forwardSessionCookies(NextResponse.rewrite(url), supabaseResponse);
    }

    if (subdomain === "vet") {
      const url = request.nextUrl.clone();
      url.pathname = `/vet-portal${request.nextUrl.pathname}`;
      return forwardSessionCookies(NextResponse.rewrite(url), supabaseResponse);
    }

    // Unknown subdomain — validate against agencies table
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
      const { createServerClient: createServiceServerClient } = await import("@supabase/ssr");
      const serviceSupabase = createServiceServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey,
        { cookies: { getAll: () => [], setAll: () => {} } }
      );

      const { data: agency } = await serviceSupabase
        .from("agencies")
        .select("slug")
        .eq("slug", subdomain)
        .not("slug", "is", null)
        .maybeSingle();

      if (!agency) {
        return new NextResponse(null, { status: 404 });
      }

      // Valid agency subdomain — rewrite to /wl/[slug] and set header
      const url = request.nextUrl.clone();
      const originalPath = request.nextUrl.pathname;
      url.pathname = `/wl/${subdomain}${originalPath}`;

      const rewriteResponse = NextResponse.rewrite(url);
      rewriteResponse.headers.set("x-agency-slug", subdomain);
      return forwardSessionCookies(rewriteResponse, supabaseResponse);
    }
  }
  // ── End subdomain routing ──────────────────────────────────────────────────

  const { pathname } = request.nextUrl;

  // Protect /dashboard routes — redirect to login if not authenticated.
  if (pathname.startsWith("/dashboard") && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Protect /admin routes — must be logged in AND have role = 'admin'.
  // Uses the service-role client so the check operates outside RLS and cannot
  // be defeated by a misconfigured policy that lets users write their own role.
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      // Fail closed — cannot verify admin role without service key.
      console.error("[middleware] SUPABASE_SERVICE_ROLE_KEY is not set; denying admin access");
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      return NextResponse.redirect(dashboardUrl);
    }

    const { createServerClient: createServiceServerClient } = await import("@supabase/ssr");
    const serviceSupabase = createServiceServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    const { data: profile, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("[middleware] Failed to fetch profile for admin check:", profileError.message);
    }
    if (profile?.role !== "admin") {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // Redirect authenticated users away from auth pages.
  if ((pathname === "/login" || pathname === "/signup") && user) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.searchParams.delete("redirectTo");
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}
