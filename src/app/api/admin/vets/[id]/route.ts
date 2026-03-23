import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { Resend } from "resend";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/subscription";
import type { ApiSuccessResponse, ApiErrorResponse } from "@/types/api";
import type { VetProfileRow, ProfileRow } from "@/types/database";

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json(
    { success: false, error: message, status } satisfies ApiErrorResponse,
    { status }
  );
}

/**
 * PATCH /api/admin/vets/[id]
 * Approve or reject a vet profile. Admin only.
 * - approve: sets verified_at = now(), daff_approved = true, emails the vet
 * - reject: deletes the row so the vet can re-register
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("Authentication required", 401);
  }

  // 2. Admin role check
  try {
    await requireAdmin(user.id);
  } catch (err) {
    const e = err as { status?: number; message?: string };
    if (e?.status === 403) {
      return errorResponse(e.message ?? "Admin access required", 403);
    }
    return errorResponse("Internal server error", 500);
  }

  // 3. Parse params and body
  const { id: vetProfileId } = await params;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const parsed = actionSchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse("Invalid action. Must be 'approve' or 'reject'", 400);
  }

  const { action } = parsed.data;
  const service = createServiceClient();

  // 4. Fetch the vet profile to get the user_id
  const { data: vetProfile, error: fetchError } = await service
    .from("vet_profiles")
    .select("*")
    .eq("id", vetProfileId)
    .maybeSingle();

  if (fetchError) {
    return errorResponse("Failed to fetch vet profile", 500);
  }

  if (!vetProfile) {
    return errorResponse("Vet profile not found", 404);
  }

  const profile = vetProfile as VetProfileRow;

  if (action === "reject") {
    // Delete the row — vet can re-register
    const { error: deleteError } = await service
      .from("vet_profiles")
      .delete()
      .eq("id", vetProfileId);

    if (deleteError) {
      return errorResponse("Failed to delete vet profile", 500);
    }

    return new NextResponse(null, { status: 204 });
  }

  // action === "approve"
  const now = new Date().toISOString();

  const { data: updatedProfile, error: updateError } = await service
    .from("vet_profiles")
    .update({ verified_at: now, daff_approved: true })
    .eq("id", vetProfileId)
    .select("*")
    .single();

  if (updateError || !updatedProfile) {
    return errorResponse("Failed to approve vet profile", 500);
  }

  // Fire-and-forget: email the vet user
  const { data: userProfile } = await service
    .from("profiles")
    .select("email")
    .eq("id", profile.user_id)
    .maybeSingle();

  const vetEmail = (userProfile as Pick<ProfileRow, "email"> | null)?.email;

  if (vetEmail) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    resend.emails
      .send({
        from: "PetBorder <no-reply@petborder.com>",
        to: vetEmail,
        subject: "Your PetBorder vet portal access has been approved",
        html: `<p>Your PetBorder vet portal access has been approved. You can now <a href="https://petborder.com/vet-portal">access the vet portal</a>.</p>`,
      })
      .catch(() => {
        // Intentionally ignore — email failure must not block the response
      });
  }

  return NextResponse.json({
    success: true,
    data: updatedProfile as VetProfileRow,
  } satisfies ApiSuccessResponse<VetProfileRow>);
}
