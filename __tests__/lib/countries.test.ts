import { describe, it, expect } from "vitest";
import {
  getCountryByCode,
  getCountriesByGroup,
  getAllCountries,
  searchCountries,
  COUNTRIES,
} from "@/lib/countries";

describe("countries", () => {
  describe("getCountryByCode", () => {
    it("returns Group 1 country for NZ", () => {
      const c = getCountryByCode("NZ");
      expect(c).toBeDefined();
      expect(c!.group).toBe(1);
    });

    it("returns Group 2 country for GB", () => {
      const c = getCountryByCode("GB");
      expect(c).toBeDefined();
      expect(c!.group).toBe(2);
    });

    it("returns Group 3 country for US", () => {
      const c = getCountryByCode("US");
      expect(c).toBeDefined();
      expect(c!.group).toBe(3);
    });

    it("returns undefined for unknown code", () => {
      expect(getCountryByCode("XX")).toBeUndefined();
    });

    it("is case-insensitive", () => {
      expect(getCountryByCode("nz")).toBeDefined();
      expect(getCountryByCode("gb")).toBeDefined();
    });
  });

  describe("getCountriesByGroup", () => {
    it("returns NZ, Norfolk Island, and Cocos Islands for Group 1", () => {
      const group1 = getCountriesByGroup(1);
      expect(group1.length).toBe(3);
      const codes = group1.map((c) => c.code);
      expect(codes).toContain("NZ");
      expect(codes).toContain("NF");
      expect(codes).toContain("CC");
    });

    it("includes UK, Ireland, and Hawaii for Group 2", () => {
      const group2 = getCountriesByGroup(2);
      const codes = group2.map((c) => c.code);
      expect(codes).toContain("GB");
      expect(codes).toContain("IE");
      expect(codes).toContain("HI");
    });

    it("includes USA and Germany for Group 3 (Japan is Group 2)", () => {
      const group3 = getCountriesByGroup(3);
      const codes = group3.map((c) => c.code);
      expect(codes).toContain("US");
      expect(codes).toContain("DE");
      expect(codes).not.toContain("JP"); // Japan moved to Group 2
    });

    it("every country in COUNTRIES belongs to exactly one group", () => {
      const all = getAllCountries();
      const g1 = getCountriesByGroup(1).length;
      const g2 = getCountriesByGroup(2).length;
      const g3 = getCountriesByGroup(3).length;
      expect(g1 + g2 + g3).toBe(all.length);
    });
  });

  describe("getAllCountries", () => {
    it("returns a sorted array", () => {
      const all = getAllCountries();
      const names = all.map((c) => c.name);
      const sorted = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sorted);
    });

    it("has no duplicate codes", () => {
      const codes = COUNTRIES.map((c) => c.code);
      const unique = new Set(codes);
      expect(unique.size).toBe(codes.length);
    });
  });

  describe("searchCountries", () => {
    it("finds countries by partial name", () => {
      const results = searchCountries("united");
      expect(results.length).toBeGreaterThan(0);
      results.forEach((c) =>
        expect(c.name.toLowerCase()).toContain("united")
      );
    });

    it("is case-insensitive", () => {
      const lower = searchCountries("new zealand");
      const upper = searchCountries("NEW ZEALAND");
      expect(lower).toEqual(upper);
    });

    it("returns empty array for no matches", () => {
      expect(searchCountries("zzznomatch")).toHaveLength(0);
    });
  });

  describe("Hawaii special case", () => {
    it("lists Hawaii as Group 2, separate from USA", () => {
      const hawaii = getCountryByCode("HI");
      expect(hawaii).toBeDefined();
      expect(hawaii!.group).toBe(2);

      const us = getCountryByCode("US");
      expect(us!.group).toBe(3);
    });
  });
});
