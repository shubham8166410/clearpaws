import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { petCreateSchema } from "@/lib/pet-schema";
import type { ApiErrorResponse } from "@/types/timeline";

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code } satisfies ApiErrorResponse, { status });
}

/** POST /api/pets — create a new pet for the authenticated user */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

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

  const parsed = petCreateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse("Invalid request body", "VALIDATION_ERROR", 400);
  }

  // Enforce server-side pet limit — client-side guard alone is insufficient
  const { count, error: countError } = await supabase
    .from("pets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (countError || count === null) {
    return errorResponse("Failed to check pet count", "DB_ERROR", 500);
  }
  if (count >= 5) {
    return errorResponse("Maximum 5 pets per account", "LIMIT_EXCEEDED", 422);
  }

  const { name, type, breed, microchip_number, date_of_birth } = parsed.data;

  const { data, error } = await supabase
    .from("pets")
    .insert({
      user_id: user.id,
      name,
      type,
      breed,
      microchip_number: microchip_number ?? null,
      date_of_birth: date_of_birth ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/pets] Insert failed:", error.message);
    return errorResponse("Failed to create pet", "DB_ERROR", 500);
  }

  return NextResponse.json(data, { status: 201 });
}

/** GET /api/pets — list all pets for the authenticated user */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return errorResponse("Authentication required", "UNAUTHENTICATED", 401);
  }

  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[GET /api/pets] Query failed:", error.message);
    return errorResponse("Failed to fetch pets", "DB_ERROR", 500);
  }

  return NextResponse.json(data ?? []);
}
