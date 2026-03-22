// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock is hoisted — use vi.hoisted() so mockCreate is available inside the factory
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { create: mockCreate };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_opts: unknown) {}
  }
  return { default: MockAnthropic };
});

// Mock countries lookup
vi.mock("@/lib/countries", () => ({
  getCountryByCode: vi.fn().mockImplementation((code: string) => {
    const map: Record<string, { code: string; name: string; group: number }> = {
      US: { code: "US", name: "United States (mainland)", group: 3 },
      NZ: { code: "NZ", name: "New Zealand", group: 1 },
      GB: { code: "GB", name: "United Kingdom", group: 2 },
    };
    return map[code] ?? undefined;
  }),
}));

import { generateTimeline } from "@/lib/anthropic";

function makeValidStepResponse(overrides: Record<string, unknown> = {}) {
  return {
    stepNumber: 1,
    title: "Get microchip implanted",
    description: "Have your vet implant an ISO 15-digit microchip. This must happen before any vaccination.",
    dueDate: "2026-04-01",
    daysFromNow: 10,
    category: "vaccination",
    isCompleted: false,
    sourceUrl: "https://www.agriculture.gov.au/biosecurity-trade/cats-dogs/how-to-import",
    urgency: "immediate",
    canBeCompletedByOwner: false,
    requiresVet: true,
    requiresGovernmentPortal: false,
    estimatedCostAUD: 80,
    ...overrides,
  };
}

function makeValidClaudeResponse() {
  return {
    steps: [makeValidStepResponse()],
    warnings: [
      {
        severity: "info",
        message: "This timeline is a guide only. Always verify with DAFF.",
        sourceUrl: "https://www.agriculture.gov.au/biosecurity-trade/cats-dogs",
      },
    ],
    totalEstimatedCostAUD: 8000,
    originGroup: 3,
    quarantineDays: 10,
    earliestTravelDate: "2027-01-01",
    summary: "Your dog needs a Group 3 process with RNATT blood test.",
    daffGroup: 3,
    minimumLeadTimeWeeks: 32,
    isBreedRestricted: false,
    breedRestrictionNote: null,
    isTravelDateFeasible: true,
    travelDateWarning: null,
    costEstimate: {
      biconPermit: 1265,
      quarantine: 520,
      vetEstimateMin: 500,
      vetEstimateMax: 1500,
      totalMin: 5000,
      totalMax: 14000,
      currency: "AUD",
      disclaimer: "Costs are estimates only.",
    },
    disclaimer:
      "This timeline is based on DAFF rules last verified 2026-03-22. Requirements can change. Always confirm with DAFF at agriculture.gov.au before booking travel for your pet.",
    dataLastVerified: "2026-03-22",
    verifyAtUrl: "https://www.agriculture.gov.au/biosecurity-trade/cats-dogs",
  };
}

function mockClaudeSuccess(data: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(data) }],
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("generateTimeline()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws for an unknown country code", async () => {
    await expect(
      generateTimeline({
        petType: "dog",
        petBreed: "Labrador",
        originCountry: "ZZ",
        travelDate: "2027-06-01",
      })
    ).rejects.toThrow("Unknown country code");
  });

  it("returns a validated TimelineOutput for a valid Claude response", async () => {
    mockCreate.mockResolvedValueOnce(mockClaudeSuccess(makeValidClaudeResponse()));

    const result = await generateTimeline({
      petType: "dog",
      petBreed: "Labrador",
      originCountry: "US",
      travelDate: "2027-06-01",
    });

    expect(result).toBeDefined();
    expect(result.steps).toHaveLength(1);
    expect(result.originGroup).toBe(3);
  });

  it("every step in the response has a sourceUrl", async () => {
    mockCreate.mockResolvedValueOnce(mockClaudeSuccess(makeValidClaudeResponse()));

    const result = await generateTimeline({
      petType: "dog",
      petBreed: "Labrador",
      originCountry: "US",
      travelDate: "2027-06-01",
    });

    for (const step of result.steps) {
      expect(step.sourceUrl, `Step '${step.title}' missing sourceUrl`).toBeTruthy();
    }
  });

  it("retries once when Claude returns invalid JSON", async () => {
    mockCreate
      .mockResolvedValueOnce({ content: [{ type: "text", text: "not json" }] })
      .mockResolvedValueOnce(mockClaudeSuccess(makeValidClaudeResponse()));

    const result = await generateTimeline({
      petType: "dog",
      petBreed: "Labrador",
      originCountry: "US",
      travelDate: "2027-06-01",
    });

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.steps).toHaveLength(1);
  });

  it("retries once when Zod validation fails, then succeeds", async () => {
    const invalidResponse = { ...makeValidClaudeResponse(), steps: "not-an-array" };
    mockCreate
      .mockResolvedValueOnce(mockClaudeSuccess(invalidResponse))
      .mockResolvedValueOnce(mockClaudeSuccess(makeValidClaudeResponse()));

    const result = await generateTimeline({
      petType: "dog",
      petBreed: "Labrador",
      originCountry: "US",
      travelDate: "2027-06-01",
    });

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(Array.isArray(result.steps)).toBe(true);
  });

  it("throws after 2 failed attempts", async () => {
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "bad json {{{" }] });

    await expect(
      generateTimeline({
        petType: "dog",
        petBreed: "Labrador",
        originCountry: "US",
        travelDate: "2027-06-01",
      })
    ).rejects.toThrow();

    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("system prompt includes DAFF rules JSON context", async () => {
    mockCreate.mockResolvedValueOnce(mockClaudeSuccess(makeValidClaudeResponse()));

    await generateTimeline({
      petType: "dog",
      petBreed: "Labrador",
      originCountry: "US",
      travelDate: "2027-06-01",
    });

    const callArgs = mockCreate.mock.calls[0][0] as { system: string };
    expect(callArgs.system).toContain("rnattWaitDays");
    expect(callArgs.system).toContain("agriculture.gov.au");
    expect(callArgs.system).toContain("ONLY the rules provided below");
  });

  it("system prompt instructs Claude not to use training data", async () => {
    mockCreate.mockResolvedValueOnce(mockClaudeSuccess(makeValidClaudeResponse()));

    await generateTimeline({
      petType: "dog",
      petBreed: "Labrador",
      originCountry: "US",
      travelDate: "2027-06-01",
    });

    const callArgs = mockCreate.mock.calls[0][0] as { system: string };
    expect(callArgs.system).toContain("Do NOT use any DAFF knowledge from your training data");
  });

  it("response includes disclaimer and dataLastVerified", async () => {
    mockCreate.mockResolvedValueOnce(mockClaudeSuccess(makeValidClaudeResponse()));

    const result = await generateTimeline({
      petType: "dog",
      petBreed: "Labrador",
      originCountry: "US",
      travelDate: "2027-06-01",
    });

    expect(result.disclaimer).toBeTruthy();
    expect(result.dataLastVerified).toBeTruthy();
  });

  it("handles Claude response wrapped in markdown code block", async () => {
    const json = JSON.stringify(makeValidClaudeResponse());
    const wrapped = `Here is your timeline:\n\`\`\`json\n${json}\n\`\`\``;
    mockCreate.mockResolvedValueOnce({ content: [{ type: "text", text: wrapped }] });

    const result = await generateTimeline({
      petType: "dog",
      petBreed: "Labrador",
      originCountry: "US",
      travelDate: "2027-06-01",
    });

    expect(result.steps).toHaveLength(1);
  });

  it("Group 1 country (NZ) generates a timeline without error", async () => {
    const nzResponse = {
      ...makeValidClaudeResponse(),
      originGroup: 1,
      daffGroup: 1,
      quarantineDays: 0,
      minimumLeadTimeWeeks: 4,
    };
    mockCreate.mockResolvedValueOnce(mockClaudeSuccess(nzResponse));

    const result = await generateTimeline({
      petType: "cat",
      petBreed: "Domestic Shorthair",
      originCountry: "NZ",
      travelDate: "2026-06-01",
    });

    expect(result.originGroup).toBe(1);
  });
});
