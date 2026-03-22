import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { agencyQuerySchema } from "@/lib/finder-schema";
import type { AgencyRow } from "@/types/database";
import type { ApiErrorResponse } from "@/types/timeline";

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code } satisfies ApiErrorResponse, { status });
}

/** GET /api/agencies — returns all pet transport agencies, optionally filtered by state */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // Validate query params
  const { searchParams } = req.nextUrl;
  const rawState = searchParams.get("state");

  const parsed = agencyQuerySchema.safeParse(
    rawState !== null ? { state: rawState } : {}
  );

  if (!parsed.success) {
    return errorResponse("Invalid state code. Must be a valid Australian state abbreviation.", "VALIDATION_ERROR", 400);
  }

  const { state } = parsed.data;

  try {
    const supabase = await createClient();

    // Two code paths to avoid fighting the chained builder types
    const { data, error } = state
      ? await supabase
          .from("agencies")
          .select("*")
          .contains("states_served", [state])
          .order("rating", { ascending: false })
      : await supabase
          .from("agencies")
          .select("*")
          .order("rating", { ascending: false });

    if (error) {
      return errorResponse("Failed to fetch agencies", "DB_ERROR", 500);
    }

    const agencies = (data ?? []) as AgencyRow[];

    return NextResponse.json({ data: agencies });
  } catch {
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
