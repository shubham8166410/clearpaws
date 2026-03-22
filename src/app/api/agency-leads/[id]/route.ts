import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { ApiErrorResponse } from "@/types/timeline";

// ── Zod schema ────────────────────────────────────────────────────────────────

const patchBodySchema = z.object({
  status: z.enum(["new", "contacted", "converted", "lost"]).optional(),
  notes: z.string().max(5000).optional(),
});

// ── Helper ────────────────────────────────────────────────────────────────────

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json(
    { error: message, code: "ERROR" } satisfies ApiErrorResponse,
    { status }
  );
}

// ── PATCH /api/agency-leads/[id] ──────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("Authentication required", 401);
  }

  const { id } = await params;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const parsed = patchBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse("Invalid request body", 400);
  }

  const { status, notes } = parsed.data;

  if (status === undefined && notes === undefined) {
    return errorResponse("Nothing to update", 400);
  }

  const serviceClient = createServiceClient();

  // Verify the lead exists and belongs to an agency owned by this user (join check)
  const { data: lead, error: leadError } = await serviceClient
    .from("agency_leads")
    .select("id, agency_id")
    .eq("id", id)
    .maybeSingle();

  if (leadError) {
    console.error("[PATCH /api/agency-leads/:id] Lead lookup failed:", leadError.message);
    return errorResponse("Internal server error", 500);
  }

  if (!lead) {
    return errorResponse("Lead not found", 404);
  }

  // Confirm the agency that owns this lead is owned by the current user
  const { data: agency, error: agencyError } = await serviceClient
    .from("agencies")
    .select("id")
    .eq("id", lead.agency_id)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (agencyError) {
    console.error("[PATCH /api/agency-leads/:id] Agency lookup failed:", agencyError.message);
    return errorResponse("Internal server error", 500);
  }

  if (!agency) {
    return errorResponse("Forbidden: you do not own this lead", 403);
  }

  // Build update object with only provided fields
  const updateFields: { status?: typeof status; notes?: string } = {};
  if (status !== undefined) updateFields.status = status;
  if (notes !== undefined) updateFields.notes = notes;

  const { data: updated, error: updateError } = await serviceClient
    .from("agency_leads")
    .update(updateFields)
    .eq("id", id)
    .select("*")
    .single();

  if (updateError) {
    console.error("[PATCH /api/agency-leads/:id] Update failed:", updateError.message);
    return errorResponse("Failed to update lead", 500);
  }

  return NextResponse.json(updated);
}
