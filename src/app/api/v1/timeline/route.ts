import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { timelineInputSchema } from "@/lib/timeline-schema";
import { sanitizeTimelineInput } from "@/lib/sanitize";
import { generateTimeline } from "@/lib/anthropic";
import type { ApiSuccessResponse, ApiErrorResponse } from "@/types/api";
import type { TimelineOutput } from "@/types/timeline";

function errorResponse(message: string, status: number): NextResponse<ApiErrorResponse> {
  const body: ApiErrorResponse = { success: false, error: message, status };
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const serviceClient = createServiceClient();

  // 1. Authenticate API key
  const auth = await authenticateApiKey(req, serviceClient);
  if (auth instanceof NextResponse) return auth;

  // 2. Parse request body
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse("Invalid JSON in request body", 400);
  }

  // 3. Validate with Zod
  const parseResult = timelineInputSchema.safeParse(rawBody);
  if (!parseResult.success) {
    const issues = parseResult.error.issues.map((i) => ({
      path: i.path,
      message: i.message,
    }));
    const body: ApiErrorResponse = {
      success: false,
      error: parseResult.error.issues[0]?.message ?? "Validation failed",
      status: 422,
    };
    return NextResponse.json({ ...body, issues }, { status: 422 });
  }

  // 4. Sanitize inputs
  const sanitized = sanitizeTimelineInput(parseResult.data);

  // 5. Generate timeline via Claude
  let timeline: TimelineOutput;
  try {
    timeline = await generateTimeline(sanitized);
  } catch (err) {
    console.error("[v1/timeline] Generation failed:", err);
    return errorResponse("Failed to generate timeline. Please try again.", 500);
  }

  // 6. Fire-and-forget: insert agency_leads row if this key belongs to an agency
  if (auth.apiKey.agency_id) {
    void Promise.resolve(
      serviceClient
        .from("agency_leads")
        .insert({
          agency_id: auth.apiKey.agency_id,
          pet_owner_email: "",
          status: "new" as const,
        })
    ).catch((err: unknown) =>
      console.error("[v1/timeline] Failed to insert agency_leads row:", err)
    );
  }

  // 7. Return success with rate limit headers
  const successBody: ApiSuccessResponse<TimelineOutput> = {
    success: true,
    data: timeline,
  };

  return NextResponse.json(successBody, {
    status: 200,
    headers: auth.rateLimitHeaders,
  });
}
