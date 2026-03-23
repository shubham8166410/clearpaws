// @vitest-environment node
import { describe, it, expect } from "vitest";

import {
  AUSTRALIA_EXPORT_PROCESS,
  DESTINATION_RULES,
  getTierForCountry,
  getOutboundTimeline,
  isOutboundBreedBanned,
  OutboundRulesSchema,
} from "@/lib/outbound-rules";

// ── AUSTRALIA_EXPORT_PROCESS integrity ───────────────────────────────────────

describe("AUSTRALIA_EXPORT_PROCESS — data integrity", () => {
  it("has exactly 5 export steps", () => {
    expect(AUSTRALIA_EXPORT_PROCESS.steps.length).toBe(5);
  });

  it("every step has a non-empty id, title, and description", () => {
    for (const step of AUSTRALIA_EXPORT_PROCESS.steps) {
      expect(step.id, `step missing id`).toBeTruthy();
      expect(step.title, `step '${step.id}' missing title`).toBeTruthy();
      expect(step.description, `step '${step.id}' missing description`).toBeTruthy();
    }
  });

  it("every step has a sourceUrl pointing to agriculture.gov.au", () => {
    for (const step of AUSTRALIA_EXPORT_PROCESS.steps) {
      expect(step.sourceUrl, `step '${step.id}' missing sourceUrl`).toBeTruthy();
      expect(step.sourceUrl, `step '${step.id}' must point to agriculture.gov.au`).toContain("agriculture.gov.au");
    }
  });

  it("every step has a lastVerified date in YYYY-MM-DD format", () => {
    for (const step of AUSTRALIA_EXPORT_PROCESS.steps) {
      expect(step.lastVerified, `step '${step.id}' missing lastVerified`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("contains the DAFF export permit step with 72-hour window detail", () => {
    const permitStep = AUSTRALIA_EXPORT_PROCESS.steps.find((s) => s.id === "daff-export-permit");
    expect(permitStep).toBeDefined();
    expect(permitStep!.permitWindowHours).toBe(72);
  });

  it("contains the Notice of Intention step with ≥10 business days requirement", () => {
    const noiStep = AUSTRALIA_EXPORT_PROCESS.steps.find((s) => s.id === "daff-noi");
    expect(noiStep).toBeDefined();
    expect(noiStep!.minBusinessDaysBeforeDeparture).toBeGreaterThanOrEqual(10);
  });
});

// ── DESTINATION_RULES integrity ───────────────────────────────────────────────

describe("DESTINATION_RULES — Tier 1 country count", () => {
  const tier1 = Object.values(DESTINATION_RULES).filter((c) => c.tier === 1);

  it("has exactly 15 Tier 1 countries", () => {
    expect(tier1.length).toBe(15);
  });

  it("includes all expected Tier 1 countries", () => {
    const codes = Object.keys(DESTINATION_RULES);
    expect(codes).toContain("GB");
    expect(codes).toContain("US");
    expect(codes).toContain("NZ");
    expect(codes).toContain("CA");
    expect(codes).toContain("SG");
    expect(codes).toContain("JP");
    expect(codes).toContain("AE");
    expect(codes).toContain("DE");
    expect(codes).toContain("FR");
    expect(codes).toContain("IE");
    expect(codes).toContain("NL");
    expect(codes).toContain("CH");
    expect(codes).toContain("IT");
    expect(codes).toContain("ES");
    expect(codes).toContain("HK");
  });
});

describe("DESTINATION_RULES — every Tier 1 entry has required fields", () => {
  const tier1Entries = Object.entries(DESTINATION_RULES).filter(([, c]) => c.tier === 1);

  it("every Tier 1 country has a non-empty sourceUrl", () => {
    for (const [code, rules] of tier1Entries) {
      expect(rules.sourceUrl, `${code} missing sourceUrl`).toBeTruthy();
    }
  });

  it("every Tier 1 country has a lastVerified date in YYYY-MM-DD format", () => {
    for (const [code, rules] of tier1Entries) {
      expect(rules.lastVerified, `${code} missing lastVerified`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("every Tier 1 country has estimatedLeadTimeWeeks > 0", () => {
    for (const [code, rules] of tier1Entries) {
      expect(rules.estimatedLeadTimeWeeks, `${code} missing estimatedLeadTimeWeeks`).toBeGreaterThan(0);
    }
  });

  it("every Tier 1 country has healthCertificate with validity window", () => {
    for (const [code, rules] of tier1Entries) {
      expect(rules.healthCertificate, `${code} missing healthCertificate`).toBeDefined();
      expect(
        rules.healthCertificate.validityDaysDog,
        `${code} healthCertificate.validityDaysDog must be > 0`
      ).toBeGreaterThan(0);
    }
  });
});

// ── Critical country-specific rules ──────────────────────────────────────────

describe("UK (GB) — critical rules must not regress", () => {
  const uk = DESTINATION_RULES["GB"];

  it("tier is 1", () => expect(uk.tier).toBe(1));
  it("no quarantine required (Australia is a listed country)", () => {
    expect(uk.quarantine.required).toBe(false);
  });
  it("no titer test required from Australia", () => {
    expect(uk.titerTest.required).toBe(false);
  });
  it("tapeworm treatment required for dogs", () => {
    expect(uk.tapeworm.requiredForDogs).toBe(true);
  });
  it("tapeworm NOT required for cats", () => {
    expect(uk.tapeworm.requiredForCats).toBe(false);
  });
  it("tapeworm must contain praziquantel", () => {
    expect(uk.tapeworm.activeIngredient).toBe("praziquantel");
  });
  it("tapeworm window is 24–120 hours before UK entry", () => {
    expect(uk.tapeworm.minHoursBeforeEntry).toBe(24);
    expect(uk.tapeworm.maxHoursBeforeEntry).toBe(120);
  });
  it("health cert validity: 5 days for dogs", () => {
    expect(uk.healthCertificate.validityDaysDog).toBe(5);
  });
  it("health cert validity: 10 days for cats", () => {
    expect(uk.healthCertificate.validityDaysCat).toBe(10);
  });
  it("sourceUrl contains gov.uk", () => {
    expect(uk.sourceUrl).toContain("gov.uk");
  });
});

describe("New Zealand (NZ) — critical rules must not regress", () => {
  const nz = DESTINATION_RULES["NZ"];

  it("tier is 1", () => expect(nz.tier).toBe(1));
  it("no import permit required from Australia (Category 1)", () => {
    expect(nz.importPermit.required).toBe(false);
  });
  it("no titer test required from Australia", () => {
    expect(nz.titerTest.required).toBe(false);
  });
  it("quarantine is required and is 10 days", () => {
    expect(nz.quarantine.required).toBe(true);
    expect(nz.quarantine.durationDays).toBe(10);
  });
  it("requires MPI notification ≥72 hours before arrival", () => {
    expect(nz.advanceNoticeHours).toBeGreaterThanOrEqual(72);
  });
  it("sourceUrl contains mpi.govt.nz", () => {
    expect(nz.sourceUrl).toContain("mpi.govt.nz");
  });
});

describe("Japan (JP) — critical rules must not regress", () => {
  const jp = DESTINATION_RULES["JP"];

  it("tier is 1", () => expect(jp.tier).toBe(1));
  it("titer test is required", () => {
    expect(jp.titerTest.required).toBe(true);
  });
  it("titer test wait is 180 days", () => {
    expect(jp.titerTest.waitDaysAfterTest).toBe(180);
  });
  it("advance notice to quarantine station is required", () => {
    expect(jp.advanceNoticeRequired).toBe(true);
  });
  it("estimated lead time is ≥24 weeks (6 months)", () => {
    expect(jp.estimatedLeadTimeWeeks).toBeGreaterThanOrEqual(24);
  });
  it("sourceUrl contains maff.go.jp", () => {
    expect(jp.sourceUrl).toContain("maff.go.jp");
  });
});

describe("Singapore (SG) — critical rules must not regress", () => {
  const sg = DESTINATION_RULES["SG"];

  it("tier is 1", () => expect(sg.tier).toBe(1));
  it("titer test is required", () => {
    expect(sg.titerTest.required).toBe(true);
  });
  it("has specific microchip standard note (AVID or FECAVA)", () => {
    const notes = sg.notes.join(" ");
    expect(notes.toLowerCase()).toMatch(/avid|fecava/);
  });
  it("sourceUrl contains nparks.gov.sg", () => {
    expect(sg.sourceUrl).toContain("nparks.gov.sg");
  });
});

describe("USA (US) — critical rules must not regress", () => {
  const us = DESTINATION_RULES["US"];

  it("tier is 1", () => expect(us.tier).toBe(1));
  it("no quarantine required from Australia", () => {
    expect(us.quarantine.required).toBe(false);
  });
  it("no titer test required", () => {
    expect(us.titerTest.required).toBe(false);
  });
  it("has CDC screwworm-free country note", () => {
    const notes = us.notes.join(" ");
    expect(notes.toLowerCase()).toContain("screwworm");
  });
  it("sourceUrl contains usda.gov or aphis.usda.gov", () => {
    expect(us.sourceUrl).toMatch(/usda\.gov/);
  });
});

describe("EU countries — use EU-level sourceUrl", () => {
  const euCodes = ["DE", "FR", "NL", "IT", "ES"] as const;

  it("all EU countries reference ec.europa.eu as sourceUrl", () => {
    for (const code of euCodes) {
      const rules = DESTINATION_RULES[code];
      expect(rules.sourceUrl, `${code} should use EU canonical source`).toContain("ec.europa.eu");
    }
  });

  it("all EU countries have a note about EU Regulation 576/2013", () => {
    for (const code of euCodes) {
      const notes = DESTINATION_RULES[code].notes.join(" ");
      expect(notes, `${code} should mention EU harmonisation`).toMatch(/576\/2013|EU member/i);
    }
  });
});

describe("Switzerland (CH) — has own rules, not EU", () => {
  const ch = DESTINATION_RULES["CH"];

  it("tier is 1", () => expect(ch.tier).toBe(1));
  it("sourceUrl contains blv.admin.ch", () => {
    expect(ch.sourceUrl).toContain("blv.admin.ch");
  });
  it("sourceUrl does NOT use ec.europa.eu", () => {
    expect(ch.sourceUrl).not.toContain("ec.europa.eu");
  });
});

describe("Hong Kong (HK) — uses AFCD, not mainland China", () => {
  const hk = DESTINATION_RULES["HK"];

  it("tier is 1", () => expect(hk.tier).toBe(1));
  it("sourceUrl contains afcd.gov.hk", () => {
    expect(hk.sourceUrl).toContain("afcd.gov.hk");
  });
});

// ── getTierForCountry ─────────────────────────────────────────────────────────

describe("getTierForCountry()", () => {
  it("returns 1 for GB", () => expect(getTierForCountry("GB")).toBe(1));
  it("returns 1 for NZ", () => expect(getTierForCountry("NZ")).toBe(1));
  it("returns 1 for JP", () => expect(getTierForCountry("JP")).toBe(1));
  it("returns 2 for unknown country codes", () => {
    expect(getTierForCountry("XX")).toBe(2);
  });
  it("returns 2 for empty string", () => {
    expect(getTierForCountry("")).toBe(2);
  });
});

// ── getOutboundTimeline — date calculation ────────────────────────────────────

describe("getOutboundTimeline() — UK dog", () => {
  // Departure: Monday 2027-01-18
  const result = getOutboundTimeline({
    destinationCode: "GB",
    petType: "dog",
    departureDate: new Date("2027-01-18"),
    isAlreadyMicrochipped: false,
  });

  it("returns steps array", () => {
    expect(Array.isArray(result.steps)).toBe(true);
  });

  it("has at least 7 steps (5 AU export + destination steps)", () => {
    expect(result.steps.length).toBeGreaterThanOrEqual(7);
  });

  it("every step has calculatedDate, sourceUrl, isVerified", () => {
    for (const step of result.steps) {
      expect(step.calculatedDate, `step '${step.id}' missing calculatedDate`).toBeInstanceOf(Date);
      expect(step.sourceUrl, `step '${step.id}' missing sourceUrl`).toBeTruthy();
      expect(typeof step.isVerified, `step '${step.id}' isVerified must be boolean`).toBe("boolean");
    }
  });

  it("DAFF export permit step is within 72 hours before departure (Thu–Fri for Monday departure)", () => {
    const permitStep = result.steps.find((s) => s.id === "daff-export-permit");
    expect(permitStep).toBeDefined();
    const dep = new Date("2027-01-18"); // Monday
    const permitDate = permitStep!.calculatedDate;
    const diffMs = dep.getTime() - permitDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    // Must be issued within 72 hours — so permitDate >= departure - 72h
    expect(diffHours).toBeLessThanOrEqual(72);
    expect(diffHours).toBeGreaterThan(0);
  });

  it("health cert vet inspection is within 5 days of departure (dog, UK)", () => {
    const healthCertStep = result.steps.find((s) => s.id === "destination-health-cert");
    expect(healthCertStep).toBeDefined();
    const dep = new Date("2027-01-18");
    const inspDate = healthCertStep!.calculatedDate;
    const diffDays = (dep.getTime() - inspDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeLessThanOrEqual(5);
    expect(diffDays).toBeGreaterThanOrEqual(0);
  });

  it("includes tapeworm treatment step for UK dog", () => {
    const tapewormStep = result.steps.find((s) => s.id === "destination-tapeworm");
    expect(tapewormStep).toBeDefined();
  });

  it("all steps have calculatedDate before or on departure date", () => {
    const dep = new Date("2027-01-18");
    for (const step of result.steps) {
      expect(
        step.calculatedDate.getTime(),
        `step '${step.id}' calculatedDate is after departure`
      ).toBeLessThanOrEqual(dep.getTime() + 24 * 60 * 60 * 1000); // +1 day tolerance for same-day
    }
  });
});

describe("getOutboundTimeline() — NZ cat", () => {
  const result = getOutboundTimeline({
    destinationCode: "NZ",
    petType: "cat",
    departureDate: new Date("2027-03-01"),
    isAlreadyMicrochipped: true,
  });

  it("includes quarantine step (NZ always requires quarantine)", () => {
    const qStep = result.steps.find((s) => s.id === "destination-quarantine");
    expect(qStep).toBeDefined();
    expect(qStep!.description).toMatch(/10/);
  });

  it("does NOT include tapeworm step (NZ cat)", () => {
    const tapewormStep = result.steps.find((s) => s.id === "destination-tapeworm");
    expect(tapewormStep).toBeUndefined();
  });

  it("microchip step is shown as already complete when isAlreadyMicrochipped = true", () => {
    const chipStep = result.steps.find((s) => s.id === "au-microchip");
    expect(chipStep).toBeDefined();
    expect(chipStep!.alreadyComplete).toBe(true);
    expect(chipStep!.title).toContain("Verify");
  });
});

describe("getOutboundTimeline() — Japan dog (long lead time)", () => {
  const result = getOutboundTimeline({
    destinationCode: "JP",
    petType: "dog",
    departureDate: new Date("2027-06-01"),
    isAlreadyMicrochipped: false,
  });

  it("includes titer test step", () => {
    const titerStep = result.steps.find((s) => s.id === "destination-titer-test");
    expect(titerStep).toBeDefined();
  });

  it("titer test step calculatedDate is at least 180 days before departure", () => {
    const titerStep = result.steps.find((s) => s.id === "destination-titer-test");
    expect(titerStep).toBeDefined();
    const dep = new Date("2027-06-01");
    const diffDays = (dep.getTime() - titerStep!.calculatedDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(180);
  });

  it("result.hasLongLeadTimeWarning is true for Japan", () => {
    expect(result.hasLongLeadTimeWarning).toBe(true);
  });
});

describe("getOutboundTimeline() — UAE cat (Tier 2 fallback)", () => {
  // UAE may be Tier 2 if exact page cannot be confirmed
  const result = getOutboundTimeline({
    destinationCode: "AE",
    petType: "cat",
    departureDate: new Date("2027-04-01"),
    isAlreadyMicrochipped: false,
  });

  it("still returns AU export steps (at least 5 steps)", () => {
    const auSteps = result.steps.filter((s) => s.section === "au-export");
    expect(auSteps.length).toBeGreaterThanOrEqual(5);
  });

  it("destination steps are marked isVerified = false for Tier 2", () => {
    const destSteps = result.steps.filter((s) => s.section === "destination");
    if (destSteps.length > 0) {
      for (const step of destSteps) {
        expect(step.isVerified).toBe(false);
      }
    }
  });
});

// ── isOutboundBreedBanned ────────────────────────────────────────────────────

describe("isOutboundBreedBanned()", () => {
  it("returns true for Pit Bull to UK (banned)", () => {
    expect(isOutboundBreedBanned("Pit Bull Terrier", "GB")).toBe(true);
  });

  it("returns false for Labrador to any country", () => {
    expect(isOutboundBreedBanned("Labrador Retriever", "GB")).toBe(false);
    expect(isOutboundBreedBanned("Labrador Retriever", "NZ")).toBe(false);
  });
});

// ── Zod schema ────────────────────────────────────────────────────────────────

describe("OutboundRulesSchema", () => {
  it("parses DESTINATION_RULES without throwing", () => {
    expect(() => OutboundRulesSchema.parse(DESTINATION_RULES)).not.toThrow();
  });
});
