import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the OAuth callback from Supabase (Google OAuth + email magic link).
 * Exchanges the one-time code for a session and redirects to the intended destination.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Validate redirectTo: must be a relative path.
  // Reject protocol-relative URLs (//evil.com) — browsers treat them as absolute.
  const rawRedirect = searchParams.get("redirectTo") ?? "/dashboard";
  const redirectTo =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      // Session exchange succeeded but user is null — treat as failure
      if (!user) {
        return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
      }

      // Detect new users: created_at and last_sign_in_at are equal (within 5s) on first sign-in
      const isNewUser =
        user !== null &&
        user.created_at !== undefined &&
        user.last_sign_in_at !== undefined &&
        Math.abs(
          new Date(user.created_at).getTime() -
          new Date(user.last_sign_in_at).getTime()
        ) < 5000;

      // New users land on dashboard with welcome toast; returning users go to redirectTo.
      // Preserve restorePending flag so a pending timeline is not lost on first sign-up.
      const hasPending = redirectTo.includes("restorePending=true");
      const destination = isNewUser
        ? `/dashboard?welcome=1${hasPending ? "&restorePending=true" : ""}`
        : redirectTo;

      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  // Redirect to login with an error flag on failure
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
