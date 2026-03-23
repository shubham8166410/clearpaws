import { NextRequest, NextResponse } from "next/server";
import { timelineInputSchema } from "@/lib/timeline-schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeTimelineInput } from "@/lib/sanitize";
import { generateTimeline } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/subscription";
import { roleAtLeast } from "@/types/subscription";
import type { ApiErrorResponse } from "@/types/timeline";

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0].trim();
    if (ip) return ip;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return null; // Unknown IP — caller must decide how to handle
}

function errorResponse(
  message: string,
  code: string,
  status: number
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ error: message, code }, { status });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Check if subscriber — skip rate limit for paid users
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isSubscriber = user
    ? roleAtLeast(await getUserRole(user.id), "subscriber")
    : false;

  // 2. Rate limiting (skipped for subscribers)
  let rateLimit = { allowed: true, remaining: 999, resetAt: new Date() };
  if (!isSubscriber) {
    const ip = getClientIp(req);
    if (ip === null) {
      return errorResponse("Unable to determine client identity", "NO_IP", 400);
    }
    rateLimit = checkRateLimit(`ratelimit:timeline:${ip}`);
  }

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. You can generate up to 5 timelines per day.",
        code: "RATE_LIMITED",
      } satisfies ApiErrorResponse,
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(
            (rateLimit.resetAt.getTime() - Date.now()) / 1000
          ).toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
        },
      }
    );
  }

  // 2. Parse request body
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse("Invalid JSON in request body", "INVALID_JSON", 400);
  }

  // 3. Validate with Zod
  const parseResult = timelineInputSchema.safeParse(rawBody);
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    const message = firstIssue?.message ?? "Invalid input";
    return errorResponse(message, "VALIDATION_ERROR", 400);
  }

  // 4. Sanitize inputs
  const sanitized = sanitizeTimelineInput(parseResult.data);

  // 5. Generate timeline via Claude
  try {
    const timeline = await generateTimeline(sanitized);
    return NextResponse.json(timeline, {
      headers: {
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("[generate-timeline] Generation failed:", err);
    // Don't expose internal errors to client
    return errorResponse(
      "We could not generate your timeline. Please try again.",
      "GENERATION_ERROR",
      500
    );
  }
}
