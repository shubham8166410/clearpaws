import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { vetQuerySchema } from "@/lib/finder-schema";
import type { VetClinicRow } from "@/types/database";

function errorResponse(message: string, code: string, status: number): NextResponse {
  return NextResponse.json({ error: message, code }, { status });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const rawState = searchParams.get("state") ?? undefined;

    const parsed = vetQuerySchema.safeParse({ state: rawState });
    if (!parsed.success) {
      return errorResponse("Invalid state code. Must be a valid Australian state.", "INVALID_STATE", 400);
    }

    const { state } = parsed.data;
    const supabase = createServiceClient();

    let query = supabase
      .from("vet_clinics")
      .select("*")
      .eq("daff_approved", true);

    if (state !== undefined) {
      query = query.eq("state", state);
    }

    const { data, error } = await query;

    if (error) {
      return errorResponse("Failed to fetch vet clinics.", "DB_ERROR", 500);
    }

    return NextResponse.json({ data: data as VetClinicRow[] });
  } catch (err) {
    console.error("[api/vets] Unexpected error:", err instanceof Error ? err.message : err);
    return errorResponse("Unexpected server error", "INTERNAL_ERROR", 500);
  }
}
