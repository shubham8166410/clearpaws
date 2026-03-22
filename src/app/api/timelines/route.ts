import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { timelineInputSchema } from "@/lib/timeline-schema";
import { timelineOutputSchema } from "@/lib/timeline-schema";
import { z } from "zod/v4";
import type { ApiErrorResponse } from "@/types/timeline";

const saveTimelineBodySchema = z.object({
  input: timelineInputSchema,
  output: timelineOutputSchema,
});

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code } satisfies ApiErrorResponse, { status });
}

/** POST /api/timelines — save a generated timeline to the authenticated user's account */
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

  const parsed = saveTimelineBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse("Invalid request body", "VALIDATION_ERROR", 400);
  }

  const { input, output } = parsed.data;

  const { data, error } = await supabase
    .from("timelines")
    .insert({
      user_id: user.id,
      origin_country: input.originCountry,
      travel_date: input.travelDate,
      pet_type: input.petType,
      pet_breed: input.petBreed,
      daff_group: output.originGroup,
      generated_steps: {
        steps: output.steps,
        warnings: output.warnings,
        totalEstimatedCostAUD: output.totalEstimatedCostAUD,
        quarantineDays: output.quarantineDays,
        earliestTravelDate: output.earliestTravelDate,
        summary: output.summary,
      },
    })
    .select("id")
    .single();

  if (error) {
    console.error("[POST /api/timelines] Insert failed:", error.message);
    return errorResponse("Failed to save timeline", "DB_ERROR", 500);
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

/** GET /api/timelines — list all timelines for the authenticated user */
export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return errorResponse("Authentication required", "UNAUTHENTICATED", 401);
  }

  const { data, error } = await supabase
    .from("timelines")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET /api/timelines] Query failed:", error.message);
    return errorResponse("Failed to fetch timelines", "DB_ERROR", 500);
  }

  return NextResponse.json(data);
}
