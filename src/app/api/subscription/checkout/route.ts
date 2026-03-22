import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { stripe, SUBSCRIPTION_PRICE_ID } from "@/lib/stripe";
import type { ApiErrorResponse } from "@/types/timeline";

const bodySchema = z.object({
  plan: z.literal("subscriber"),
});

const ALLOWED_ORIGINS = new Set([
  "https://clearpaws.com.au",
  "https://www.clearpaws.com.au",
  ...(process.env.NODE_ENV === "development" ? ["http://localhost:3000"] : []),
]);

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code } satisfies ApiErrorResponse, { status });
}

/** POST /api/subscription/checkout — create a Stripe Checkout session for the monthly subscription */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse("Authentication required", "UNAUTHENTICATED", 401);

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse("Invalid JSON", "INVALID_JSON", 400);
  }

  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse("plan must be 'subscriber'", "VALIDATION_ERROR", 400);
  }

  // Validate origin against allowlist to prevent open-redirect via crafted headers
  const rawOrigin = req.headers.get("origin") ?? "";
  const origin = ALLOWED_ORIGINS.has(rawOrigin) ? rawOrigin : "https://clearpaws.com.au";

  const serviceClient = createServiceClient();

  // Look up or create Stripe customer
  let stripeCustomerId: string;

  const { data: existingSub } = await serviceClient
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  if (existingSub?.stripe_customer_id) {
    stripeCustomerId = existingSub.stripe_customer_id;
  } else {
    // Always create a new Stripe customer — avoids email-based dedup ambiguity
    // (multiple customers can share an email in Stripe).
    const customer = await stripe.customers.create({
      email: user.email!,
      metadata: { userId: user.id },
    });
    stripeCustomerId = customer.id;

    // Persist customer ID only — status will be set by the webhook on confirmation.
    // Do NOT write status: "active" here — payment has not been confirmed yet.
    await serviceClient.from("subscriptions").upsert({
      user_id: user.id,
      stripe_customer_id: stripeCustomerId,
    }, { onConflict: "user_id" });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: SUBSCRIPTION_PRICE_ID, quantity: 1 }],
    subscription_data: {
      metadata: { userId: user.id },
    },
    success_url: `${origin}/dashboard?subscription=success`,
    cancel_url: `${origin}/dashboard?subscription=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
