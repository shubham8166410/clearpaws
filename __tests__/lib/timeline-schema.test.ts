import { describe, it, expect } from "vitest";
import { timelineInputSchema, timelineOutputSchema } from "@/lib/timeline-schema";

const validInput = {
  petType: "dog",
  petBreed: "Labrador",
  originCountry: "US",
  travelDate: "2027-09-15",
};

describe("timelineInputSchema", () => {
  it("accepts valid input", () => {
    const result = timelineInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects invalid petType", () => {
    const result = timelineInputSchema.safeParse({
      ...validInput,
      petType: "bird",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty petBreed", () => {
    const result = timelineInputSchema.safeParse({
      ...validInput,
      petBreed: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects petBreed over 100 characters", () => {
    const result = timelineInputSchema.safeParse({
      ...validInput,
      petBreed: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown country code", () => {
    const result = timelineInputSchema.safeParse({
      ...validInput,
      originCountry: "XX",
    });
    expect(result.success).toBe(false);
  });

  it("rejects past travel date", () => {
    const result = timelineInputSchema.safeParse({
      ...validInput,
      travelDate: "2020-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects travel date more than 2 years out", () => {
    const far = new Date();
    far.setFullYear(far.getFullYear() + 3);
    const result = timelineInputSchema.safeParse({
      ...validInput,
      travelDate: far.toISOString().split("T")[0],
    });
    expect(result.success).toBe(false);
  });

  it("rejects Bengal cat", () => {
    const result = timelineInputSchema.safeParse({
      petType: "cat",
      petBreed: "Bengal",
      originCountry: "US",
      travelDate: "2027-06-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = JSON.stringify(result.error.issues);
      expect(msg).toContain("Bengal");
    }
  });

  it("rejects Bengal cat with mixed case", () => {
    const result = timelineInputSchema.safeParse({
      petType: "cat",
      petBreed: "bengal",
      originCountry: "US",
      travelDate: "2027-06-01",
    });
    expect(result.success).toBe(false);
  });

  it("does NOT reject Bengal dog (only cats are banned)", () => {
    const result = timelineInputSchema.safeParse({
      petType: "dog",
      petBreed: "Bengal Hound",
      originCountry: "US",
      travelDate: "2027-06-01",
    });
    expect(result.success).toBe(true);
  });

  it("trims whitespace from breed", () => {
    const result = timelineInputSchema.safeParse({
      ...validInput,
      petBreed: "  Labrador  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.petBreed).toBe("Labrador");
    }
  });

  it("accepts Group 1 country", () => {
    const result = timelineInputSchema.safeParse({
      ...validInput,
      originCountry: "NZ",
    });
    expect(result.success).toBe(true);
  });

  it("accepts Group 2 country", () => {
    const result = timelineInputSchema.safeParse({
      ...validInput,
      originCountry: "GB",
    });
    expect(result.success).toBe(true);
  });
});

describe("timelineOutputSchema", () => {
  const validOutput = {
    steps: [
      {
        stepNumber: 1,
        title: "Microchip implantation",
        description: "Get ISO-compliant microchip implanted",
        dueDate: "2026-09-01",
        daysFromNow: 165,
        category: "logistics",
        isCompleted: false,
        estimatedCost: { description: "Vet fee", amountAUD: 150 },
      },
    ],
    warnings: [
      { severity: "critical", message: "Microchip must be before vaccination" },
    ],
    totalEstimatedCostAUD: 3000,
    originGroup: 3,
    quarantineDays: 10,
    earliestTravelDate: "2027-03-01",
    summary: "Complex Group 3 journey from USA",
  };

  it("accepts valid output", () => {
    const result = timelineOutputSchema.safeParse(validOutput);
    expect(result.success).toBe(true);
  });

  it("rejects output missing required fields", () => {
    const { steps: _steps, ...noSteps } = validOutput;
    const result = timelineOutputSchema.safeParse(noSteps);
    expect(result.success).toBe(false);
  });

  it("rejects invalid severity", () => {
    const result = timelineOutputSchema.safeParse({
      ...validOutput,
      warnings: [{ severity: "emergency", message: "test" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid step category", () => {
    const result = timelineOutputSchema.safeParse({
      ...validOutput,
      steps: [{ ...validOutput.steps[0], category: "magic" }],
    });
    expect(result.success).toBe(false);
  });
});
