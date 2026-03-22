import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { ApiErrorResponse } from "@/types/timeline";

// ── Helper ────────────────────────────────────────────────────────────────────

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json(
    { error: message, code: "ERROR" } satisfies ApiErrorResponse,
    { status }
  );
}

/** Escape a CSV field: wrap in quotes and double any internal quotes. */
function csvField(value: string | null | undefined): string {
  const str = value ?? "";
  return `"${str.replace(/"/g, '""')}"`;
}

// ── GET /api/agency-leads/export ──────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("Authentication required", 401);
  }

  const serviceClient = createServiceClient();

  // Verify caller is an agency owner
  const { data: agency, error: agencyError } = await serviceClient
    .from("agencies")
    .select("id")
    .eq("owner_user_id", user.id)
    .not("slug", "is", null)
    .maybeSingle();

  if (agencyError) {
    console.error("[GET /api/agency-leads/export] Agency lookup failed:", agencyError.message);
    return errorResponse("Internal server error", 500);
  }

  if (!agency) {
    return errorResponse("Forbidden: not an agency owner", 403);
  }

  // Fetch leads, joining with timelines for origin_country and travel_date
  const { data: leads, error: leadsError } = await serviceClient
    .from("agency_leads")
    .select(`
      id,
      pet_owner_name,
      pet_owner_email,
      status,
      created_at,
      timelines (
        origin_country,
        travel_date
      )
    `)
    .eq("agency_id", agency.id)
    .order("created_at", { ascending: false });

  if (leadsError) {
    console.error("[GET /api/agency-leads/export] Query failed:", leadsError.message);
    return errorResponse("Failed to fetch leads", 500);
  }

  // Build CSV
  const headers = ["name", "email", "status", "origin_country", "travel_date", "created_at"];
  const rows = (leads ?? []).map((row) => {
    // timelines may be an object or null (one-to-one join via timeline_id)
    const timeline = Array.isArray(row.timelines) ? row.timelines[0] : row.timelines;
    return [
      csvField(row.pet_owner_name),
      csvField(row.pet_owner_email),
      csvField(row.status),
      csvField(timeline?.origin_country ?? null),
      csvField(timeline?.travel_date ?? null),
      csvField(row.created_at),
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\r\n");

  const today = new Date().toISOString().split("T")[0];

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${today}.csv"`,
    },
  });
}
