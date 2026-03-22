import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { ApiErrorResponse } from "@/types/timeline";
import type { UserRole, SubscriptionStatus } from "@/types/subscription";

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code } satisfies ApiErrorResponse, { status });
}

export interface SubscriptionStatusResponse {
  role: UserRole;
  subscriptionStatus: SubscriptionStatus | null;
  currentPeriodEnd: string | null;
}

/** GET /api/subscription/status — returns the user's current role and subscription details */
export async function GET(_req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse("Authentication required", "UNAUTHENTICATED", 401);

  // Read role from profiles (fast — single row by PK)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as UserRole) ?? "free";

  // If subscriber, also return subscription detail (expiry, status)
  if (role === "subscriber") {
    const serviceClient = createServiceClient();
    const { data: sub } = await serviceClient
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      role,
      subscriptionStatus: (sub?.status as SubscriptionStatus) ?? null,
      currentPeriodEnd: sub?.current_period_end ?? null,
    } satisfies SubscriptionStatusResponse);
  }

  return NextResponse.json({
    role,
    subscriptionStatus: null,
    currentPeriodEnd: null,
  } satisfies SubscriptionStatusResponse);
}
