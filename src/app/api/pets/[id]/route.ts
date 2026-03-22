import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { petUpdateSchema, petCreateSchema } from "@/lib/pet-schema";
import type { ApiErrorResponse } from "@/types/timeline";
import type { PetRow } from "@/types/database";

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code } satisfies ApiErrorResponse, { status });
}

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/pets/[id] — fetch a single pet owned by the authenticated user */
export async function GET(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return errorResponse("Authentication required", "UNAUTHENTICATED", 401);
  }

  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return errorResponse("Pet not found", "NOT_FOUND", 404);
  }

  return NextResponse.json(data);
}

/** PUT /api/pets/[id] — update a pet owned by the authenticated user */
export async function PUT(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return errorResponse("Authentication required", "UNAUTHENTICATED", 401);
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse("Invalid JSON", "INVALID_JSON", 400);
  }

  // Validate the patch body first (catches type/breed combos if both are present)
  const parsed = petUpdateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse("Invalid request body", "VALIDATION_ERROR", 400);
  }

  // Fetch the existing record to verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from("pets")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) {
    return errorResponse("Pet not found", "NOT_FOUND", 404);
  }

  // Merge patch with existing to perform full Bengal check
  const merged: PetRow = { ...(existing as PetRow), ...parsed.data };
  const fullCheck = petCreateSchema.safeParse({
    name: merged.name,
    type: merged.type,
    breed: merged.breed,
    microchip_number: merged.microchip_number ?? undefined,
    date_of_birth: merged.date_of_birth ?? undefined,
  });
  if (!fullCheck.success) {
    return errorResponse("Invalid request body", "VALIDATION_ERROR", 400);
  }

  const { data, error } = await supabase
    .from("pets")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    console.error("[PUT /api/pets/[id]] Update failed:", error?.message);
    return errorResponse("Failed to update pet", "DB_ERROR", 500);
  }

  return NextResponse.json(data);
}

/** DELETE /api/pets/[id] — delete a pet owned by the authenticated user */
export async function DELETE(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return errorResponse("Authentication required", "UNAUTHENTICATED", 401);
  }

  // Verify ownership before deleting
  const { data: existing, error: fetchError } = await supabase
    .from("pets")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) {
    return errorResponse("Pet not found", "NOT_FOUND", 404);
  }

  const { error } = await supabase
    .from("pets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[DELETE /api/pets/[id]] Delete failed:", error.message);
    return errorResponse("Failed to delete pet", "DB_ERROR", 500);
  }

  return new NextResponse(null, { status: 204 });
}
