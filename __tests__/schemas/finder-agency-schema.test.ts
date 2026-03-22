import { describe, it, expect } from "vitest";
import { vetQuerySchema, labQuerySchema, agencyQuerySchema } from "@/lib/finder-schema";

describe("vetQuerySchema", () => {
  it("accepts valid state", () => {
    expect(vetQuerySchema.safeParse({ state: "VIC" }).success).toBe(true);
  });

  it("accepts missing state (returns all)", () => {
    expect(vetQuerySchema.safeParse({}).success).toBe(true);
  });

  it("rejects invalid state", () => {
    expect(vetQuerySchema.safeParse({ state: "INVALID" }).success).toBe(false);
  });

  it("normalises state to uppercase", () => {
    const result = vetQuerySchema.safeParse({ state: "vic" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.state).toBe("VIC");
  });
});

describe("labQuerySchema", () => {
  it("accepts valid country", () => {
    expect(labQuerySchema.safeParse({ country: "USA" }).success).toBe(true);
  });

  it("accepts missing country (returns all)", () => {
    expect(labQuerySchema.safeParse({}).success).toBe(true);
  });

  it("rejects empty string country", () => {
    expect(labQuerySchema.safeParse({ country: "" }).success).toBe(false);
  });
});

describe("agencyQuerySchema", () => {
  it("accepts valid state filter", () => {
    expect(agencyQuerySchema.safeParse({ state: "NSW" }).success).toBe(true);
  });

  it("accepts empty query", () => {
    expect(agencyQuerySchema.safeParse({}).success).toBe(true);
  });
});
