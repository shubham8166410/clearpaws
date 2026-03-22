import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { VetClinicRow } from "@/types/database";
import type { ApiSuccessResponse, ApiErrorResponse } from "@/types/api";

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json(
    { success: false, error: message, status } satisfies ApiErrorResponse,
    { status }
  );
}

/**
 * GET /api/vet-clinics
 * Returns all vet clinics. Public — no auth required.
 * Used by the vet portal registration form.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const service = createServiceClient();

    const { data, error } = await service
      .from("vet_clinics")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      return errorResponse("Failed to fetch vet clinics", 500);
    }

    return NextResponse.json({
      success: true,
      data: (data ?? []) as VetClinicRow[],
    } satisfies ApiSuccessResponse<VetClinicRow[]>);
  } catch {
    return errorResponse("Internal server error", 500);
  }
}
