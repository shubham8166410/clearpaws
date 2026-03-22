import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { ApiSuccessResponse, ApiErrorResponse } from "@/types/api";
import type { AgencyRow } from "@/types/database";

const patchSchema = z.object({
  logo_url: z.string().url().max(500).optional().nullable(),
  primary_colour: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "primary_colour must be a valid hex colour")
    .optional(),
  secondary_colour: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "secondary_colour must be a valid hex colour")
    .optional()
    .nullable(),
  contact_email: z.string().email().optional(),
});

function errorResponse(message: string, status: number): NextResponse<ApiErrorResponse> {
  const body: ApiErrorResponse = { success: false, error: message, status };
  return NextResponse.json(body, { status });
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** PATCH /api/agencies/[id]/settings */
export async function PATCH(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;

  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("Authentication required", 401);
  }

  // 2. Verify ownership
  const serviceClient = createServiceClient();
  const { data: existing, error: fetchError } = await serviceClient
    .from("agencies")
    .select("id")
    .eq("id", id)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    console.error("[PATCH /api/agencies/:id/settings] Agency lookup failed:", fetchError.message);
    return errorResponse("Internal server error", 500);
  }

  if (!existing) {
    return errorResponse("Agency not found", 404);
  }

  // 3. Parse body
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse("Invalid JSON in request body", 400);
  }

  const parsed = patchSchema.safeParse(rawBody);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Validation failed";
    const body: ApiErrorResponse = { success: false, error: message, status: 422 };
    return NextResponse.json(body, { status: 422 });
  }

  // 4. Build update — only include provided fields
  const updateData: Partial<Pick<AgencyRow, "logo_url" | "primary_colour" | "secondary_colour" | "contact_email">> = {};

  if ("logo_url" in parsed.data) updateData.logo_url = parsed.data.logo_url ?? null;
  if (parsed.data.primary_colour !== undefined) updateData.primary_colour = parsed.data.primary_colour;
  if ("secondary_colour" in parsed.data) updateData.secondary_colour = parsed.data.secondary_colour ?? null;
  if (parsed.data.contact_email !== undefined) updateData.contact_email = parsed.data.contact_email;

  const { data: updated, error: updateError } = await serviceClient
    .from("agencies")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updated) {
    console.error("[PATCH /api/agencies/:id/settings] Update failed:", updateError?.message);
    return errorResponse("Failed to update agency settings", 500);
  }

  const body: ApiSuccessResponse<AgencyRow> = {
    success: true,
    data: updated as AgencyRow,
  };
  return NextResponse.json(body, { status: 200 });
}
