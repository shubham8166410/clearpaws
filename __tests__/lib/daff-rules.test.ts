// @vitest-environment node
import { describe, it, expect } from "vitest";

// Tests written FIRST — implementation does not exist yet (RED phase)
import {
  DAFF_RULES,
  DaffRulesSchema,
  getBannedBreeds,
  isBreedBanned,
  getRulesAsContext,
  getGroupRules,
} from "@/lib/daff-rules";

// ── Data integrity ────────────────────────────────────────────────────────────

describe("DAFF_RULES — top-level metadata", () => {
  it("has a lastVerified date in YYYY-MM-DD format", () => {
    expect(DAFF_RULES.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("has a non-empty sourceUrl", () => {
    expect(DAFF_RULES.sourceUrl).toBeTruthy();
    expect(DAFF_RULES.sourceUrl).toContain("agriculture.gov.au");
  });
});

describe("DAFF_RULES.generalRules — source citations", () => {
  it("every rule has a non-empty sourceUrl", () => {
    for (const rule of DAFF_RULES.generalRules) {
      expect(rule.sourceUrl, `Rule '${rule.id}' missing sourceUrl`).toBeTruthy();
      expect(rule.sourceUrl, `Rule '${rule.id}' sourceUrl must point to agriculture.gov.au`).toContain("agriculture.gov.au");
    }
  });

  it("every rule has a lastVerified date in YYYY-MM-DD format", () => {
    for (const rule of DAFF_RULES.generalRules) {
      expect(rule.lastVerified, `Rule '${rule.id}' missing lastVerified`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("contains the entry-airport rule", () => {
    const rule = DAFF_RULES.generalRules.find((r) => r.id === "entry-airport");
    expect(rule).toBeDefined();
    expect(rule!.rule).toContain("Melbourne");
  });

  it("contains the rnatt-wait rule with 180-day detail", () => {
    const rule = DAFF_RULES.generalRules.find((r) => r.id === "rnatt-wait");
    expect(rule).toBeDefined();
    expect(rule!.rule).toContain("180");
  });

  it("identity-verification-timing rule references both 10 and 30 day quarantine outcomes", () => {
    const rule = DAFF_RULES.generalRules.find((r) => r.id === "identity-verification-timing");
    expect(rule).toBeDefined();
    expect(rule!.detail).toContain("10");
    expect(rule!.detail).toContain("30");
  });

  it("health-certificate-timing rule references 5 days", () => {
    const rule = DAFF_RULES.generalRules.find((r) => r.id === "health-certificate-timing");
    expect(rule).toBeDefined();
    expect(rule!.rule).toContain("5 days");
  });
});

describe("DAFF_RULES.breedRestrictions — source citations", () => {
  it("every breed restriction has a non-empty sourceUrl", () => {
    for (const restriction of DAFF_RULES.breedRestrictions) {
      expect(restriction.sourceUrl, `Breed '${restriction.breed}' missing sourceUrl`).toBeTruthy();
    }
  });

  it("every breed restriction has a lastVerified date in YYYY-MM-DD format", () => {
    for (const restriction of DAFF_RULES.breedRestrictions) {
      expect(restriction.lastVerified, `Breed '${restriction.breed}' missing lastVerified`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("Bengal cat is listed as banned", () => {
    const bengal = DAFF_RULES.breedRestrictions.find((b) => b.breed === "Bengal cat");
    expect(bengal).toBeDefined();
    expect(bengal!.status).toBe("banned");
  });
});

// ── Critical rule regressions ────────────────────────────────────────────────

describe("DAFF_RULES.groupRules — critical values must not regress", () => {
  it("group3.rnattWaitDays === 180", () => {
    expect(DAFF_RULES.groupRules.group3.rnattWaitDays).toBe(180);
  });

  it("group1.quarantineDays === 0", () => {
    expect(DAFF_RULES.groupRules.group1.quarantineDays).toBe(0);
  });

  it("group2.quarantineDays === 10", () => {
    expect(DAFF_RULES.groupRules.group2.quarantineDays).toBe(10);
  });

  it("group3.quarantineDaysWithIdentityVerification === 10", () => {
    expect(DAFF_RULES.groupRules.group3.quarantineDaysWithIdentityVerification).toBe(10);
  });

  it("group3.quarantineDaysWithoutIdentityVerification === 30", () => {
    expect(DAFF_RULES.groupRules.group3.quarantineDaysWithoutIdentityVerification).toBe(30);
  });

  it("group1 does not require import permit", () => {
    expect(DAFF_RULES.groupRules.group1.requiresImportPermit).toBe(false);
  });

  it("group2 requires import permit", () => {
    expect(DAFF_RULES.groupRules.group2.requiresImportPermit).toBe(true);
  });

  it("group3 requires RNATT", () => {
    expect(DAFF_RULES.groupRules.group3.requiresRNATT).toBe(true);
  });

  it("group2 does NOT require RNATT", () => {
    expect(DAFF_RULES.groupRules.group2.requiresRNATT).toBe(false);
  });

  it("group1 contains New Zealand", () => {
    expect(DAFF_RULES.groupRules.group1.countries).toContain("New Zealand");
  });

  it("group2 contains United Kingdom and Japan", () => {
    expect(DAFF_RULES.groupRules.group2.countries).toContain("United Kingdom");
    expect(DAFF_RULES.groupRules.group2.countries).toContain("Japan");
  });

  it("every groupRules entry has a non-empty sourceUrl", () => {
    for (const [key, value] of Object.entries(DAFF_RULES.groupRules)) {
      expect((value as { sourceUrl: string }).sourceUrl, `${key} missing sourceUrl`).toBeTruthy();
    }
  });
});

describe("DAFF_RULES.costs — critical values must not regress", () => {
  it("biconImportPermit === 1265", () => {
    expect(DAFF_RULES.costs.biconImportPermit).toBe(1265);
  });

  it("quarantine10Days === 520", () => {
    expect(DAFF_RULES.costs.quarantine10Days).toBe(520);
  });

  it("quarantine30Days === 1560", () => {
    expect(DAFF_RULES.costs.quarantine30Days).toBe(1560);
  });

  it("currency is AUD", () => {
    expect(DAFF_RULES.costs.currency).toBe("AUD");
  });

  it("has a disclaimer", () => {
    expect(DAFF_RULES.costs.disclaimer).toBeTruthy();
  });
});

// ── Helper functions ──────────────────────────────────────────────────────────

describe("isBreedBanned()", () => {
  it("returns true for 'bengal cat' (lowercase)", () => {
    expect(isBreedBanned("bengal cat")).toBe(true);
  });

  it("returns true for 'Bengal Cat' (mixed case)", () => {
    expect(isBreedBanned("Bengal Cat")).toBe(true);
  });

  it("returns true for 'Bengal' (substring match)", () => {
    expect(isBreedBanned("Bengal")).toBe(true);
  });

  it("returns false for 'Labrador Retriever'", () => {
    expect(isBreedBanned("Labrador Retriever")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isBreedBanned("")).toBe(false);
  });

  it("returns true for 'Pit Bull Terrier'", () => {
    expect(isBreedBanned("Pit Bull Terrier")).toBe(true);
  });

  it("returns true for 'Japanese Tosa'", () => {
    expect(isBreedBanned("Japanese Tosa")).toBe(true);
  });

  it("returns true for 'Savannah cat'", () => {
    expect(isBreedBanned("Savannah cat")).toBe(true);
  });
});

describe("getBannedBreeds()", () => {
  it("returns an array of breed name strings", () => {
    const breeds = getBannedBreeds();
    expect(Array.isArray(breeds)).toBe(true);
    expect(breeds.length).toBeGreaterThan(0);
  });

  it("includes Bengal cat", () => {
    expect(getBannedBreeds()).toContain("Bengal cat");
  });

  it("includes all 6 banned breeds", () => {
    expect(getBannedBreeds().length).toBe(6);
  });
});

describe("getRulesAsContext()", () => {
  it("returns a valid JSON string", () => {
    const ctx = getRulesAsContext();
    expect(() => JSON.parse(ctx)).not.toThrow();
  });

  it("contains 'lastVerified'", () => {
    expect(getRulesAsContext()).toContain("lastVerified");
  });

  it("contains 'rnattWaitDays'", () => {
    expect(getRulesAsContext()).toContain("rnattWaitDays");
  });

  it("contains 'agriculture.gov.au'", () => {
    expect(getRulesAsContext()).toContain("agriculture.gov.au");
  });
});

describe("getGroupRules()", () => {
  it("getGroupRules(1).quarantineDays === 0", () => {
    expect(getGroupRules(1).quarantineDays).toBe(0);
  });

  it("getGroupRules(2).quarantineDays === 10", () => {
    expect(getGroupRules(2).quarantineDays).toBe(10);
  });

  it("getGroupRules(3).rnattWaitDays === 180", () => {
    expect(getGroupRules(3).rnattWaitDays).toBe(180);
  });

  it("getGroupRules(1) has requiresRNATT false", () => {
    expect(getGroupRules(1).requiresRNATT).toBe(false);
  });

  it("getGroupRules(3) has requiresRNATT true", () => {
    expect(getGroupRules(3).requiresRNATT).toBe(true);
  });
});

// ── Zod schema validation ─────────────────────────────────────────────────────

describe("DaffRulesSchema", () => {
  it("parses DAFF_RULES without throwing", () => {
    expect(() => DaffRulesSchema.parse(DAFF_RULES)).not.toThrow();
  });

  it("rejects an object missing lastVerified", () => {
    const invalid = { ...DAFF_RULES, lastVerified: undefined };
    expect(() => DaffRulesSchema.parse(invalid)).toThrow();
  });

  it("rejects an object with wrong costs.currency", () => {
    const invalid = {
      ...DAFF_RULES,
      costs: { ...DAFF_RULES.costs, currency: "USD" },
    };
    expect(() => DaffRulesSchema.parse(invalid)).toThrow();
  });
});
