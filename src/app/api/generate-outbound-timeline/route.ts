import { NextRequest, NextResponse } from "next/server";
import { outboundInputSchema } from "@/lib/outbound-schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeTextInput } from "@/lib/sanitize";
import { getOutboundTimeline } from "@/lib/outbound-rules";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/subscription";
import { roleAtLeast } from "@/types/subscription";
import type { ApiErrorResponse } from "@/types/timeline";
import type { OutboundTimelineResponse } from "@/lib/outbound-schema";

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0].trim();
    if (ip) return ip;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return null;
}

function errorResponse(
  message: string,
  code: string,
  status: number
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ error: message, code }, { status });
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Check subscriber status — subscribers skip rate limit
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isSubscriber = user
    ? roleAtLeast(await getUserRole(user.id), "subscriber")
    : false;

  // 2. Rate limiting — same bucket as /api/generate-timeline (shared 5/day/IP)
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

  // 3. Parse request body
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse("Invalid JSON in request body", "INVALID_JSON", 400);
  }

  // 4. Validate with Zod
  const parseResult = outboundInputSchema.safeParse(rawBody);
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    const message = firstIssue?.message ?? "Invalid input";
    return errorResponse(message, "VALIDATION_ERROR", 400);
  }

  const { petType, petBreed, destinationCountry, departureDate, isAlreadyMicrochipped } =
    parseResult.data;

  // 5. Sanitize text fields
  const sanitizedBreed = sanitizeTextInput(petBreed);
  const sanitizedDestination = sanitizeTextInput(destinationCountry);

  // 6. Compute timeline using the outbound rules engine (no AI — rules are deterministic)
  try {
    const timeline = getOutboundTimeline({
      destinationCode: sanitizedDestination,
      petType,
      departureDate: new Date(departureDate),
      isAlreadyMicrochipped,
    });

    // 7. Serialize Date objects → YYYY-MM-DD strings
    const response: OutboundTimelineResponse = {
      destinationCode: timeline.destinationCode,
      destinationName: timeline.destinationName,
      petType: timeline.petType,
      departureDate: formatDate(timeline.departureDate),
      tier: timeline.tier,
      hasLongLeadTimeWarning: timeline.hasLongLeadTimeWarning,
      steps: timeline.steps.map((step) => ({
        id: step.id,
        section: step.section,
        title: step.title,
        description: step.description,
        calculatedDate: formatDate(step.calculatedDate),
        sourceUrl: step.sourceUrl,
        isVerified: step.isVerified,
        estimatedCostAUD: step.estimatedCostAUD,
        alreadyComplete: step.alreadyComplete,
      })),
      lastVerified: timeline.lastVerified,
      disclaimer: timeline.disclaimer,
    };

    // 8. Optionally save to user account (non-critical — fire and forget)
    if (user) {
      void supabase
        .from("timelines")
        .insert({
          user_id: user.id,
          direction: "outbound",
          destination_country: sanitizedDestination,
          origin_country: null,
          travel_date: departureDate,
          pet_type: petType,
          pet_breed: sanitizedBreed,
          daff_group: null,
          generated_steps: {
            direction: "outbound" as const,
            destinationCode: response.destinationCode,
            destinationName: response.destinationName,
            tier: response.tier,
            hasLongLeadTimeWarning: response.hasLongLeadTimeWarning,
            steps: response.steps,
            lastVerified: response.lastVerified,
            disclaimer: response.disclaimer,
          },
        });
    }

    return NextResponse.json(response, {
      headers: {
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("[generate-outbound-timeline] Generation failed:", err);
    return errorResponse(
      "We could not generate your outbound timeline. Please try again.",
      "GENERATION_ERROR",
      500
    );
  }
}
