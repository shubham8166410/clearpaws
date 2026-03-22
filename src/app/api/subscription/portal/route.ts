import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import type { ApiErrorResponse } from "@/types/timeline";

const ALLOWED_ORIGINS = new Set([
  "https://clearpaws.com.au",
  "https://www.clearpaws.com.au",
  ...(process.env.NODE_ENV === "development" ? ["http://localhost:3000"] : []),
]);

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code } satisfies ApiErrorResponse, { status });
}

/** POST /api/subscription/portal — redirect to Stripe billing portal for cancel/update */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse("Authentication required", "UNAUTHENTICATED", 401);

  const serviceClient = createServiceClient();
  const { data: sub } = await serviceClient
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  if (!sub?.stripe_customer_id) {
    return errorResponse("No active subscription found", "NO_SUBSCRIPTION", 404);
  }

  const rawOrigin = req.headers.get("origin") ?? "";
  const origin = ALLOWED_ORIGINS.has(rawOrigin) ? rawOrigin : "https://clearpaws.com.au";

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${origin}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
