import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { Resend } from "resend";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { AgencyLeadStatus, AgencyLeadInsert } from "@/types/database";
import type { AgencyLeadListItem } from "@/types/api";
import type { ApiErrorResponse } from "@/types/timeline";

// ── Zod schemas ───────────────────────────────────────────────────────────────

const postBodySchema = z.object({
  agency_slug: z.string().min(1).max(100),
  timeline_id: z.string().uuid().optional(),
  pet_owner_email: z.string().email().max(254),
  pet_owner_name: z.string().max(100).optional(),
});

const VALID_STATUSES: AgencyLeadStatus[] = ["new", "contacted", "converted", "lost"];

const getQuerySchema = z.object({
  status: z.enum(["new", "contacted", "converted", "lost"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json(
    { error: message, code: "ERROR" } satisfies ApiErrorResponse,
    { status }
  );
}

// ── POST /api/agency-leads ────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const parsed = postBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse("Invalid request body", 400);
  }

  const { agency_slug, timeline_id, pet_owner_email, pet_owner_name } = parsed.data;

  const serviceClient = createServiceClient();

  // Look up agency by slug
  const { data: agency, error: agencyError } = await serviceClient
    .from("agencies")
    .select("id, name, contact_email")
    .eq("slug", agency_slug)
    .not("slug", "is", null)
    .maybeSingle();

  if (agencyError) {
    console.error("[POST /api/agency-leads] Agency lookup failed:", agencyError.message);
    return errorResponse("Internal server error", 500);
  }

  if (!agency) {
    return errorResponse("Agency not found", 404);
  }

  const insertData: AgencyLeadInsert = {
    agency_id: agency.id,
    pet_owner_email,
    pet_owner_name: pet_owner_name ?? null,
    timeline_id: timeline_id ?? null,
    status: "new",
  };

  const { data: lead, error: insertError } = await serviceClient
    .from("agency_leads")
    .insert(insertData)
    .select("id")
    .single();

  if (insertError) {
    console.error("[POST /api/agency-leads] Insert failed:", insertError.message);
    return errorResponse("Failed to create lead", 500);
  }

  // Fire-and-forget email notification
  if (agency.contact_email) {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      const displayName = pet_owner_name ?? "Someone";
      void resend.emails
        .send({
          from: "ClearPaws <noreply@clearpaws.com.au>",
          to: agency.contact_email,
          subject: `New lead from ${displayName}`,
          text: [
            `Pet owner: ${displayName}`,
            `Email: ${pet_owner_email}`,
            `Timeline: ${timeline_id ?? "not linked"}`,
          ].join("\n"),
        })
        .catch((err: unknown) => {
          console.error("[POST /api/agency-leads] Email send failed:", err);
        });
    }
  }

  return NextResponse.json({ id: lead.id }, { status: 201 });
}

// ── GET /api/agency-leads ─────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("Authentication required", 401);
  }

  // Verify caller is an agency owner
  const serviceClient = createServiceClient();

  const { data: agency, error: agencyError } = await serviceClient
    .from("agencies")
    .select("id")
    .eq("owner_user_id", user.id)
    .not("slug", "is", null)
    .maybeSingle();

  if (agencyError) {
    console.error("[GET /api/agency-leads] Agency lookup failed:", agencyError.message);
    return errorResponse("Internal server error", 500);
  }

  if (!agency) {
    return errorResponse("Forbidden: not an agency owner", 403);
  }

  // Parse and validate query params
  const { searchParams } = req.nextUrl;
  const rawQuery = {
    status: searchParams.get("status") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
  };

  const queryParsed = getQuerySchema.safeParse(rawQuery);
  if (!queryParsed.success) {
    return errorResponse("Invalid query parameters", 400);
  }

  const { status, limit, offset } = queryParsed.data;

  // Validate status enum manually (already validated by zod but being explicit)
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return errorResponse("Invalid status value", 400);
  }

  // Build query
  let query = serviceClient
    .from("agency_leads")
    .select("*")
    .eq("agency_id", agency.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data: leads, error: leadsError } = await query;

  if (leadsError) {
    console.error("[GET /api/agency-leads] Query failed:", leadsError.message);
    return errorResponse("Failed to fetch leads", 500);
  }

  const items: AgencyLeadListItem[] = (leads ?? []).map((row) => ({
    id: row.id,
    agency_id: row.agency_id,
    timeline_id: row.timeline_id,
    pet_owner_email: row.pet_owner_email,
    pet_owner_name: row.pet_owner_name,
    status: row.status,
    notes: row.notes,
    created_at: row.created_at,
  }));

  return NextResponse.json({ data: items });
}
