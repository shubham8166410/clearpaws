import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApiErrorResponse } from "@/types/timeline";

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code } satisfies ApiErrorResponse, { status });
}

/** DELETE /api/timelines/[id] — delete a timeline owned by the authenticated user */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return errorResponse("Authentication required", "UNAUTHENTICATED", 401);
  }

  const { id } = await params;

  // Verify ownership before deleting
  const { data: existing } = await supabase
    .from("timelines")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return errorResponse("Timeline not found", "NOT_FOUND", 404);
  }

  const { error } = await supabase
    .from("timelines")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return errorResponse("Failed to delete timeline", "DB_ERROR", 500);
  }

  return new NextResponse(null, { status: 204 });
}
