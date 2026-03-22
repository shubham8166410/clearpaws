import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import type { ApiErrorResponse } from "@/types/timeline";

const progressBodySchema = z.object({
  stepIndex: z.number().int().min(0),
  completed: z.boolean(),
});

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code } satisfies ApiErrorResponse, { status });
}

/**
 * POST /api/timelines/[id]/progress
 * Toggle a step's completion status for the authenticated user.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const supabase = await createClient();
  const { id: timelineId } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return errorResponse("Authentication required", "UNAUTHENTICATED", 401);
  }

  // Verify timeline belongs to this user
  const { data: timeline, error: fetchError } = await supabase
    .from("timelines")
    .select("id")
    .eq("id", timelineId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !timeline) {
    return errorResponse("Timeline not found", "NOT_FOUND", 404);
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse("Invalid JSON", "INVALID_JSON", 400);
  }

  const parsed = progressBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse("Invalid request body", "VALIDATION_ERROR", 400);
  }

  const { stepIndex, completed } = parsed.data;

  if (completed) {
    // Upsert — mark step as completed
    const { error } = await supabase
      .from("timeline_progress")
      .upsert(
        { timeline_id: timelineId, user_id: user.id, step_index: stepIndex },
        { onConflict: "timeline_id,step_index" }
      );

    if (error) {
      console.error("[progress] Upsert failed:", error.message);
      return errorResponse("Failed to update progress", "DB_ERROR", 500);
    }
  } else {
    // Delete — mark step as not completed
    const { error } = await supabase
      .from("timeline_progress")
      .delete()
      .eq("timeline_id", timelineId)
      .eq("user_id", user.id)
      .eq("step_index", stepIndex);

    if (error) {
      console.error("[progress] Delete failed:", error.message);
      return errorResponse("Failed to update progress", "DB_ERROR", 500);
    }
  }

  return NextResponse.json({ ok: true });
}

/** GET /api/timelines/[id]/progress — fetch completed step indices */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const supabase = await createClient();
  const { id: timelineId } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return errorResponse("Authentication required", "UNAUTHENTICATED", 401);
  }

  const { data, error } = await supabase
    .from("timeline_progress")
    .select("step_index")
    .eq("timeline_id", timelineId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[progress] Fetch failed:", error.message);
    return errorResponse("Failed to fetch progress", "DB_ERROR", 500);
  }

  return NextResponse.json({ completedStepIndices: data.map((r) => r.step_index) });
}
