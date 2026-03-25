import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, PRICE_ID, AMOUNT_CENTS } from "@/lib/stripe";
import { z } from "zod/v4";
import type { ApiErrorResponse } from "@/types/timeline";

const bodySchema = z.object({
  timelineId: z.string().uuid(),
});

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code } satisfies ApiErrorResponse, { status });
}

/** POST /api/checkout — create a Stripe Checkout session for the $15 AUD document pack */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return errorResponse("Authentication required", "UNAUTHENTICATED", 401);
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse("Invalid JSON", "INVALID_JSON", 400);
  }

  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse("timelineId is required", "VALIDATION_ERROR", 400);
  }

  const { timelineId } = parsed.data;

  // Verify timeline belongs to user
  const { data: timeline, error: fetchError } = await supabase
    .from("timelines")
    .select("id")
    .eq("id", timelineId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !timeline) {
    return errorResponse("Timeline not found", "NOT_FOUND", 404);
  }

  // Check for existing purchase
  const { data: existing } = await supabase
    .from("purchases")
    .select("id")
    .eq("timeline_id", timelineId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return errorResponse("Already purchased", "ALREADY_PURCHASED", 409);
  }

  const origin = req.headers.get("origin") ?? "https://petborder.com";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price: PRICE_ID,
        quantity: 1,
      },
    ],
    currency: "aud",
    customer_email: user.email,
    metadata: {
      userId: user.id,
      timelineId,
    },
    success_url: `${origin}/dashboard/timelines/${timelineId}?payment=success`,
    cancel_url: `${origin}/dashboard/timelines/${timelineId}?payment=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
