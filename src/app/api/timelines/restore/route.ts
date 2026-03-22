import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import type { ApiErrorResponse } from "@/types/timeline";

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code } satisfies ApiErrorResponse, { status });
}

// Accepts the raw saved timeline fields to re-insert after an undo
const restoreBodySchema = z.object({
  origin_country: z.string().min(1),
  travel_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pet_type: z.enum(["dog", "cat"]),
  pet_breed: z.string().min(1).max(100),
  daff_group: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  generated_steps: z.record(z.string(), z.unknown()),
});

/** POST /api/timelines/restore — re-insert a deleted timeline (undo support) */
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

  const parsed = restoreBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse("Invalid request body", "VALIDATION_ERROR", 400);
  }

  const { origin_country, travel_date, pet_type, pet_breed, daff_group, generated_steps } = parsed.data;

  const { data, error } = await supabase
    .from("timelines")
    .insert({
      user_id: user.id,
      origin_country,
      travel_date,
      pet_type,
      pet_breed,
      daff_group,
      generated_steps,
    })
    .select("id")
    .single();

  if (error) {
    return errorResponse("Failed to restore timeline", "DB_ERROR", 500);
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
