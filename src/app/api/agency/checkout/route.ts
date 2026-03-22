import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { stripe, B2B_PRICE_ID } from "@/lib/stripe";
import type { ApiErrorResponse } from "@/types/api";

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "clearpaws.com.au";

function errorResponse(message: string, status: number): NextResponse<ApiErrorResponse> {
  const body: ApiErrorResponse = { success: false, error: message, status };
  return NextResponse.json(body, { status });
}

/** POST /api/agency/checkout — create a Stripe Checkout session for the B2B agency subscription */
export async function POST(_req: NextRequest): Promise<NextResponse> {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("Authentication required", 401);
  }

  // 2. Look up agency
  const serviceClient = createServiceClient();
  const { data: agency, error: agencyError } = await serviceClient
    .from("agencies")
    .select("id, name")
    .eq("owner_user_id", user.id)
    .not("slug", "is", null)
    .maybeSingle();

  if (agencyError) {
    console.error("[POST /api/agency/checkout] Agency lookup failed:", agencyError.message);
    return errorResponse("Internal server error", 500);
  }

  if (!agency) {
    return errorResponse("No agency account found", 403);
  }

  // 3. Create Stripe Checkout session
  const successUrl = `https://agency.${BASE_DOMAIN}`;
  const cancelUrl = `https://agency.${BASE_DOMAIN}`;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: B2B_PRICE_ID, quantity: 1 }],
    metadata: {
      type: "b2b",
      agencyId: agency.id,
      userId: user.id,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
