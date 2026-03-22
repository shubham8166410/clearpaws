import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { ApiSuccessResponse, ApiErrorResponse } from "@/types/api";
import type { VetProfileRow, VetClientLinkRow, TimelineRow } from "@/types/database";

const completeStepSchema = z.object({
  step_index: z.number().int().min(0),
});

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json(
    { success: false, error: message, status } satisfies ApiErrorResponse,
    { status }
  );
}

/**
 * POST /api/vet/timelines/[id]/complete-step
 * Marks a timeline step as completed on behalf of a client.
 * Requires: authenticated user with a verified vet_profile linked to the timeline.
 */
export async function POST(
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

  const { id: timelineId } = await params;
  const service = createServiceClient();

  // 2. Verify user has a verified vet profile
  const { data: vetProfileData, error: vetError } = await service
    .from("vet_profiles")
    .select("id")
    .eq("user_id", user.id)
    .not("verified_at", "is", null)
    .maybeSingle();

  if (vetError) {
    return errorResponse("Failed to verify vet status", 500);
  }

  if (!vetProfileData) {
    return errorResponse("You must be a verified vet to complete steps", 403);
  }

  const vetProfile = vetProfileData as Pick<VetProfileRow, "id">;

  // 3. Validate body
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const parsed = completeStepSchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse("Invalid request body: step_index (integer >= 0) is required", 400);
  }

  const { step_index } = parsed.data;

  // 4. Verify vet has a client link to this timeline
  const { data: linkData, error: linkError } = await service
    .from("vet_client_links")
    .select("id")
    .eq("vet_profile_id", vetProfile.id)
    .eq("timeline_id", timelineId)
    .maybeSingle();

  if (linkError) {
    return errorResponse("Failed to verify client link", 500);
  }

  if (!linkData) {
    return errorResponse("You are not linked to this client's timeline", 403);
  }

  // Confirm the link row shape
  void (linkData as Pick<VetClientLinkRow, "id">);

  // 5. Fetch the timeline to get the owner's user_id
  const { data: timelineData, error: timelineError } = await service
    .from("timelines")
    .select("id, user_id")
    .eq("id", timelineId)
    .maybeSingle();

  if (timelineError) {
    return errorResponse("Failed to fetch timeline", 500);
  }

  if (!timelineData) {
    return errorResponse("Timeline not found", 404);
  }

  const timeline = timelineData as Pick<TimelineRow, "id" | "user_id">;

  // 6. Check if step already completed
  const { data: existing, error: existingError } = await service
    .from("timeline_progress")
    .select("id")
    .eq("timeline_id", timelineId)
    .eq("step_index", step_index)
    .maybeSingle();

  if (existingError) {
    return errorResponse("Failed to check existing progress", 500);
  }

  if (existing) {
    return errorResponse("Step is already marked as complete", 409);
  }

  // 7. Insert progress record using timeline owner's user_id
  const { data: progressData, error: insertError } = await service
    .from("timeline_progress")
    .insert({
      timeline_id: timelineId,
      user_id: timeline.user_id,
      step_index,
    })
    .select("timeline_id, step_index, completed_at")
    .single();

  if (insertError || !progressData) {
    return errorResponse("Failed to mark step as complete", 500);
  }

  const progress = progressData as { timeline_id: string; step_index: number; completed_at: string };

  return NextResponse.json(
    {
      success: true,
      data: {
        timeline_id: progress.timeline_id,
        step_index: progress.step_index,
        completed_at: progress.completed_at,
      },
    } satisfies ApiSuccessResponse<{ timeline_id: string; step_index: number; completed_at: string }>,
    { status: 201 }
  );
}
