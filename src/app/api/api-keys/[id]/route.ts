import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApiSuccessResponse, ApiErrorResponse, ApiKeyListItem } from "@/types/api";
import type { ApiKeyRow } from "@/types/database";

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

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;

  // 1. Authenticate via session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("Authentication required", 401);
  }

  // 2. Verify ownership — fetch key where id AND user_id match
  const { data: existing, error: fetchError } = await supabase
    .from("api_keys")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) {
    return errorResponse("API key not found", 404);
  }

  const currentRow = existing as ApiKeyRow;

  // 3. Toggle is_active
  const { data: updated, error: updateError } = await supabase
    .from("api_keys")
    .update({ is_active: !currentRow.is_active })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (updateError || !updated) {
    console.error("[api-keys PATCH] Failed to update key:", updateError);
    return errorResponse("Failed to update API key", 500);
  }

  const updatedRow = updated as ApiKeyRow;

  const body: ApiSuccessResponse<ApiKeyListItem> = {
    success: true,
    data: toListItem(updatedRow),
  };
  return NextResponse.json(body, { status: 200 });
}

export async function DELETE(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;

  // 1. Authenticate via session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("Authentication required", 401);
  }

  // 2. Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from("api_keys")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) {
    return errorResponse("API key not found", 404);
  }

  // 3. Hard delete
  const { error: deleteError } = await supabase
    .from("api_keys")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteError) {
    console.error("[api-keys DELETE] Failed to delete key:", deleteError);
    return errorResponse("Failed to delete API key", 500);
  }

  return new NextResponse(null, { status: 204 });
}
