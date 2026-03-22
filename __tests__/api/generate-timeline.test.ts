// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/generate-timeline/route";
import { NextRequest } from "next/server";
import * as anthropicModule from "@/lib/anthropic";
import * as rateLimitModule from "@/lib/rate-limit";

vi.mock("@/lib/anthropic");
vi.mock("@/lib/rate-limit");

// Mock Supabase — unauthenticated by default so rate limit tests stay valid.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  }),
}));

const mockTimeline = {
  steps: [
    {
      stepNumber: 1,
      title: "Microchip implantation",
      description: "Get ISO-compliant microchip implanted before vaccination.",
      dueDate: "2026-10-01",
      daysFromNow: 195,
      category: "logistics" as const,
      isCompleted: false,
      estimatedCost: { description: "Vet fee", amountAUD: 80 },
    },
  ],
  warnings: [
    { severity: "info" as const, message: "This timeline is a guide only." },
  ],
  totalEstimatedCostAUD: 6500,
  originGroup: 3 as const,
  quarantineDays: 10,
  earliestTravelDate: "2027-09-15",
  summary: "Complex Group 3 journey.",
};

const mockAllowed = {
  allowed: true,
  remaining: 4,
  resetAt: new Date(Date.now() + 86400000),
};

beforeEach(() => {
  vi.mocked(anthropicModule.generateTimeline).mockResolvedValue(mockTimeline);
  vi.mocked(rateLimitModule.checkRateLimit).mockReturnValue(mockAllowed);
});

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/generate-timeline", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

const validBody = {
  petType: "dog",
  petBreed: "Labrador",
  originCountry: "US",
  travelDate: "2027-09-15",
};

describe("POST /api/generate-timeline", () => {
  it("returns 200 with TimelineOutput for valid input", async () => {
    const req = makePost(validBody);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("steps");
    expect(body).toHaveProperty("warnings");
    expect(body).toHaveProperty("totalEstimatedCostAUD");
    expect(body).toHaveProperty("originGroup");
  });

  it("returns 400 for missing required fields", async () => {
    const req = makePost({ petType: "dog" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("code");
  });

  it("returns 400 for invalid petType", async () => {
    const req = makePost({ ...validBody, petType: "fish" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for Bengal cat", async () => {
    const req = makePost({
      petType: "cat",
      petBreed: "Bengal",
      originCountry: "US",
      travelDate: "2027-09-15",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.toLowerCase()).toContain("bengal");
  });

  it("returns 400 for past travel date", async () => {
    const req = makePost({ ...validBody, travelDate: "2020-01-01" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(rateLimitModule.checkRateLimit).mockReturnValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() + 86400000),
    });

    const req = makePost(validBody);
    const res = await POST(req);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/generate-timeline", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "1.2.3.4",
      },
      body: "not-json{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown country code", async () => {
    const req = makePost({ ...validBody, originCountry: "ZZ" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("uses x-real-ip header when x-forwarded-for is absent", async () => {
    const req = new NextRequest("http://localhost/api/generate-timeline", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-real-ip": "5.5.5.5",
      },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("returns 500 when Claude throws", async () => {
    vi.mocked(anthropicModule.generateTimeline).mockRejectedValue(
      new Error("API error")
    );
    const req = makePost(validBody);
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe("GENERATION_ERROR");
  });
});
