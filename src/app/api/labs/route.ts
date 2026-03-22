import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { labQuerySchema } from "@/lib/finder-schema";
import type { ApprovedLabRow } from "@/types/database";

function errorResponse(message: string, code: string, status: number): NextResponse {
  return NextResponse.json({ error: message, code }, { status });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const rawCountry = searchParams.get("country") ?? undefined;

    const parsed = labQuerySchema.safeParse({ country: rawCountry });
    if (!parsed.success) {
      return errorResponse(
        "Country cannot be empty. Provide a valid country code or omit the parameter.",
        "INVALID_COUNTRY",
        400
      );
    }

    const { country } = parsed.data;
    const supabase = createServiceClient();

    let query = supabase.from("approved_labs").select("*");

    if (country !== undefined) {
      query = query.contains("accepts_from_countries", [country]);
    }

    const { data, error } = await query;

    if (error) {
      return errorResponse("Failed to fetch approved labs.", "DB_ERROR", 500);
    }

    return NextResponse.json({ data: data as ApprovedLabRow[] });
  } catch (err) {
    console.error("[api/labs] Unexpected error:", err instanceof Error ? err.message : err);
    return errorResponse("Unexpected server error", "INTERNAL_ERROR", 500);
  }
}
