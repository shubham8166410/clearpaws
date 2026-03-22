import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/api-keys";
import type { ApiSuccessResponse, ApiErrorResponse, ApiKeyDisplay, ApiKeyListItem } from "@/types/api";
import type { ApiKeyRow } from "@/types/database";

const MAX_ACTIVE_KEYS = 5;

const createKeySchema = z.object({
  name: z
    .string()
    .min(1, "Key name is required")
    .max(100, "Key name must be 100 characters or less"),
});

function errorResponse(message: string, status: number): NextResponse<ApiErrorResponse> {
  const body: ApiErrorResponse = { success: false, error: message, status };
  return NextResponse.json(body, { status });
}

function toListItem(row: ApiKeyRow): ApiKeyListItem {
  return {
    id: row.id,
    name: row.name,
    key_prefix: row.key_prefix,
    last_used_at: row.last_used_at,
    request_count: row.request_count,
    is_active: row.is_active,
    agency_id: row.agency_id,
    created_at: row.created_at,
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Authenticate via session (Supabase user auth, not API key)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("Authentication required", 401);
  }

  // 2. Parse and validate body
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse("Invalid JSON in request body", 400);
  }

  const parseResult = createKeySchema.safeParse(rawBody);
  if (!parseResult.success) {
    const body: ApiErrorResponse = {
      success: false,
      error: parseResult.error.issues[0]?.message ?? "Validation failed",
      status: 422,
    };
    return NextResponse.json(body, { status: 422 });
  }

  const { name } = parseResult.data;

  // 3. Enforce max 5 active keys per user
  const { count, error: countError } = await supabase
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true) as { count: number | null; error: unknown };

  if (countError) {
    console.error("[api-keys POST] Failed to count keys:", countError);
    return errorResponse("Failed to create API key", 500);
  }

  if ((count ?? 0) >= MAX_ACTIVE_KEYS) {
    return errorResponse(
      `Maximum of ${MAX_ACTIVE_KEYS} active API keys allowed per account`,
      409
    );
  }

  // 4. Generate new key material
  const { raw, prefix, hash } = await generateApiKey();

  // 5. Insert into DB
  const { data: inserted, error: insertError } = await supabase
    .from("api_keys")
    .insert({
      user_id: user.id,
      key_prefix: prefix,
      key_hash: hash,
      name,
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    console.error("[api-keys POST] Failed to insert key:", insertError);
    return errorResponse("Failed to create API key", 500);
  }

  const row = inserted as ApiKeyRow;

  // 6. Return 201 with raw key (shown only once)
  const display: ApiKeyDisplay = {
    id: row.id,
    name: row.name,
    key: raw,
    created_at: row.created_at,
  };

  const body: ApiSuccessResponse<ApiKeyDisplay> = { success: true, data: display };
  return NextResponse.json(body, { status: 201 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // 1. Authenticate via session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("Authentication required", 401);
  }

  // 2. Fetch all keys for this user (omit key_hash)
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, user_id, agency_id, key_prefix, name, last_used_at, request_count, is_active, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[api-keys GET] Failed to fetch keys:", error);
    return errorResponse("Failed to fetch API keys", 500);
  }

  const items: ApiKeyListItem[] = (data as ApiKeyRow[]).map(toListItem);

  const body: ApiSuccessResponse<ApiKeyListItem[]> = { success: true, data: items };
  return NextResponse.json(body, { status: 200 });
}
