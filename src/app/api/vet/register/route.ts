import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { Resend } from "resend";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { ApiSuccessResponse, ApiErrorResponse } from "@/types/api";

const registrationSchema = z.object({
  clinic_id: z.string().uuid(),
  ahpra_number: z.string().min(1).max(20),
});

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json(
    { success: false, error: message, status } satisfies ApiErrorResponse,
    { status }
  );
}

/**
 * POST /api/vet/register
 * Creates a new vet_profiles row for the authenticated user.
 * Sends notification email to admin (fire-and-forget).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("Authentication required", 401);
  }

  // 2. Parse and validate body
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const parsed = registrationSchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse("Invalid request body: clinic_id (uuid) and ahpra_number (1-20 chars) are required", 400);
  }

  const { clinic_id, ahpra_number } = parsed.data;

  // 3. Use service client for DB operations
  const service = createServiceClient();

  // 4. Check if user already has a vet profile
  const { data: existing, error: lookupError } = await service
    .from("vet_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError) {
    return errorResponse("Failed to check existing registration", 500);
  }

  if (existing) {
    return errorResponse("You already have a vet profile registered", 409);
  }

  // 5. Insert new vet profile
  const { data: newProfile, error: insertError } = await service
    .from("vet_profiles")
    .insert({
      user_id: user.id,
      clinic_id,
      ahpra_number,
      daff_approved: false,
      verified_at: null,
    })
    .select("id")
    .single();

  if (insertError || !newProfile) {
    return errorResponse("Failed to create vet profile", 500);
  }

  // 6. Fire-and-forget admin notification email
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    resend.emails
      .send({
        from: "ClearPaws <no-reply@clearpaws.com.au>",
        to: adminEmail,
        subject: "New vet registration pending review",
        html: `<p>New vet registration pending: <strong>${ahpra_number}</strong>, clinic_id: ${clinic_id}, user_id: ${user.id}</p>`,
      })
      .catch(() => {
        // Intentionally ignore — email failure must not block the response
      });
  }

  return NextResponse.json(
    {
      success: true,
      data: { id: newProfile.id, status: "pending_verification" },
    } satisfies ApiSuccessResponse<{ id: string; status: string }>,
    { status: 201 }
  );
}
