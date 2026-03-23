import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie on every request.
 * Must be called from the root proxy.ts.
 */
export async function updateSession(request: NextRequest) {
  // ── Subdomain routing ────────────────────────────────────────────────────
  const hostname = request.headers.get("host") ?? "";
  const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "petborder.com";

  const isLocalOrPreview =
    hostname.includes("localhost") ||
    hostname.includes("127.0.0.1") ||
    hostname.includes("vercel.app");

  if (!isLocalOrPreview && hostname.endsWith(`.${BASE_DOMAIN}`)) {
    const subdomain = hostname.slice(0, hostname.length - BASE_DOMAIN.length - 1);

    if (subdomain === "agency") {
      // Rewrite to /agency-portal + preserve path
      const url = request.nextUrl.clone();
      url.pathname = `/agency-portal${request.nextUrl.pathname}`;
      return NextResponse.rewrite(url);
    }

    if (subdomain === "vet") {
      // Rewrite to /vet-portal + preserve path
      const url = request.nextUrl.clone();
      url.pathname = `/vet-portal${request.nextUrl.pathname}`;
      return NextResponse.rewrite(url);
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
      return rewriteResponse;
    }
  }
  // ── End subdomain routing ────────────────────────────────────────────────

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

  const { pathname } = request.nextUrl;

  // Protect /dashboard routes — redirect to login if not authenticated.
  if (pathname.startsWith("/dashboard") && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Protect /admin routes — must be logged in AND have role = 'admin'.
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const { data: profile, error: profileError } = await supabase
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
