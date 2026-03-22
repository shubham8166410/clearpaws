import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import type { ReferralClickInsert } from "@/types/database";

const clickBodySchema = z.object({
  timelineId: z.string().optional(),
  sourcePage: z.string().max(500).optional(),
}).optional();

/** Always returns 200 — click tracking must never block the user redirect */
function trackedResponse() {
  return NextResponse.json({ tracked: true });
}

/**
 * POST /api/agencies/[id]/click
 * Records a referral click for an agency.
 * The [id] segment receives the agency name (URL-encoded) — not a UUID.
 * Renamed from [name] to [id] to resolve Next.js dynamic segment conflict
 * with /api/agencies/[id]/settings.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // URL-decode the agency name from the path param (segment is named "id" for
  // Next.js compatibility but carries the agency display name as its value)
  const { id: rawName } = await params;
  const agencyName = decodeURIComponent(rawName);

  // Parse optional body — never fail on bad body, just ignore it
  let timelineId: string | null = null;
  let sourcePage: string | null = null;

  try {
    const rawBody = await req.json().catch(() => undefined);
    const parsed = clickBodySchema.safeParse(rawBody);
    if (parsed.success && parsed.data) {
      timelineId = parsed.data.timelineId ?? null;
      sourcePage = parsed.data.sourcePage ?? null;
    }
  } catch {
    // Body parsing is optional — swallow errors
  }

  // Attempt to get the current user (don't fail if unauthenticated)
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Unauthenticated — continue with null user_id
  }

  // Insert click record — always return 200, never block the user
  try {
    const serviceClient = createServiceClient();

    // Validate agency name exists before inserting — prevents arbitrary strings in analytics
    const { data: knownAgency } = await serviceClient
      .from("agencies")
      .select("name")
      .eq("name", agencyName)
      .maybeSingle();

    if (knownAgency) {
      const clickRecord: ReferralClickInsert = {
        agency_name: agencyName,
        user_id: userId,
        timeline_id: timelineId,
        source_page: sourcePage,
      };
      await serviceClient
        .from("referral_clicks")
        .insert({ ...clickRecord, clicked_at: new Date().toISOString() });
    }
  } catch {
    // Swallow all DB errors — tracking must never block navigation
  }

  return trackedResponse();
}
