import { describe, it, expect } from "vitest";
import { outboundInputSchema, DESTINATION_COUNTRIES } from "@/lib/outbound-schema";

const TIER1_CODES = ["GB", "US", "NZ", "CA", "SG", "JP", "AE", "DE", "FR", "IE", "NL", "CH", "IT", "ES", "HK"];

// A future date guaranteed to be in range for all tests
const VALID_DATE = "2027-06-15";

const VALID_INPUT = {
  petType: "dog",
  petBreed: "Labrador",
  destinationCountry: "GB",
  departureDate: VALID_DATE,
  isAlreadyMicrochipped: false,
};

describe("outboundInputSchema", () => {
  it("accepts valid dog input", () => {
    expect(() => outboundInputSchema.parse(VALID_INPUT)).not.toThrow();
  });

  it("accepts valid cat input", () => {
    expect(() =>
      outboundInputSchema.parse({ ...VALID_INPUT, petType: "cat" })
    ).not.toThrow();
  });

  it("accepts isAlreadyMicrochipped: true", () => {
    expect(() =>
      outboundInputSchema.parse({ ...VALID_INPUT, isAlreadyMicrochipped: true })
    ).not.toThrow();
  });

  it("rejects invalid petType", () => {
    const result = outboundInputSchema.safeParse({ ...VALID_INPUT, petType: "rabbit" });
    expect(result.success).toBe(false);
  });

  it("rejects empty breed", () => {
    const result = outboundInputSchema.safeParse({ ...VALID_INPUT, petBreed: "" });
    expect(result.success).toBe(false);
  });

  it("rejects breed over 100 characters", () => {
    const result = outboundInputSchema.safeParse({
      ...VALID_INPUT,
      petBreed: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty destinationCountry", () => {
    const result = outboundInputSchema.safeParse({
      ...VALID_INPUT,
      destinationCountry: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects destinationCountry not in the approved list", () => {
    const result = outboundInputSchema.safeParse({
      ...VALID_INPUT,
      destinationCountry: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("rejects past departure date", () => {
    const result = outboundInputSchema.safeParse({
      ...VALID_INPUT,
      departureDate: "2020-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects departure date more than 2 years away", () => {
    const result = outboundInputSchema.safeParse({
      ...VALID_INPUT,
      departureDate: "2035-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects badly formatted date", () => {
    const result = outboundInputSchema.safeParse({
      ...VALID_INPUT,
      departureDate: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean isAlreadyMicrochipped", () => {
    const result = outboundInputSchema.safeParse({
      ...VALID_INPUT,
      isAlreadyMicrochipped: "yes",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing isAlreadyMicrochipped", () => {
    const { isAlreadyMicrochipped: _removed, ...rest } = VALID_INPUT;
    const result = outboundInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe("DESTINATION_COUNTRIES", () => {
  it("is a non-empty array", () => {
    expect(DESTINATION_COUNTRIES.length).toBeGreaterThan(0);
  });

  it("contains all 15 Tier 1 country codes", () => {
    const codes = DESTINATION_COUNTRIES.map((c) => c.code);
    for (const code of TIER1_CODES) {
      expect(codes, `Expected ${code} in DESTINATION_COUNTRIES`).toContain(code);
    }
  });

  it("marks all 15 Tier 1 countries with tier: 1", () => {
    for (const code of TIER1_CODES) {
      const country = DESTINATION_COUNTRIES.find((c) => c.code === code);
      expect(country?.tier, `Expected ${code} to have tier 1`).toBe(1);
    }
  });

  it("each entry has a non-empty name", () => {
    for (const c of DESTINATION_COUNTRIES) {
      expect(c.name.length, `Empty name for code ${c.code}`).toBeGreaterThan(0);
    }
  });

  it("each entry has a valid code (non-empty string)", () => {
    for (const c of DESTINATION_COUNTRIES) {
      expect(c.code.length).toBeGreaterThan(0);
    }
  });

  it("codes are unique", () => {
    const codes = DESTINATION_COUNTRIES.map((c) => c.code);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });

  it("all tier values are 1, 2, or 3", () => {
    for (const c of DESTINATION_COUNTRIES) {
      expect([1, 2, 3]).toContain(c.tier);
    }
  });
});
