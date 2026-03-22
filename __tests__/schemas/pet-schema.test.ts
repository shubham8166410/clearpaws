import { describe, it, expect } from "vitest";
import { petCreateSchema, petUpdateSchema } from "@/lib/pet-schema";

const validPet = {
  name: "Biscuit",
  type: "dog" as const,
  breed: "Labrador Retriever",
  microchip_number: "985112345678901",
  date_of_birth: "2020-03-15",
};

describe("petCreateSchema", () => {
  it("accepts a valid dog with all fields", () => {
    expect(petCreateSchema.safeParse(validPet).success).toBe(true);
  });

  it("accepts a valid cat with optional fields omitted", () => {
    const result = petCreateSchema.safeParse({ name: "Whiskers", type: "cat", breed: "Siamese" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid pet type", () => {
    expect(petCreateSchema.safeParse({ ...validPet, type: "rabbit" }).success).toBe(false);
  });

  it("rejects empty name", () => {
    expect(petCreateSchema.safeParse({ ...validPet, name: "" }).success).toBe(false);
  });

  it("rejects name over 50 characters", () => {
    expect(petCreateSchema.safeParse({ ...validPet, name: "A".repeat(51) }).success).toBe(false);
  });

  it("rejects empty breed", () => {
    expect(petCreateSchema.safeParse({ ...validPet, breed: "" }).success).toBe(false);
  });

  it("rejects breed over 100 characters", () => {
    expect(petCreateSchema.safeParse({ ...validPet, breed: "B".repeat(101) }).success).toBe(false);
  });

  it("rejects Bengal cat", () => {
    const result = petCreateSchema.safeParse({ ...validPet, type: "cat", breed: "Bengal" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error.issues)).toContain("Bengal");
    }
  });

  it("does NOT reject Bengal breed for a dog", () => {
    expect(petCreateSchema.safeParse({ ...validPet, type: "dog", breed: "Bengal Hound" }).success).toBe(true);
  });

  it("rejects future date_of_birth", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(petCreateSchema.safeParse({ ...validPet, date_of_birth: future.toISOString().split("T")[0] }).success).toBe(false);
  });

  it("accepts null date_of_birth (optional field)", () => {
    const { date_of_birth: _, ...withoutDob } = validPet;
    expect(petCreateSchema.safeParse(withoutDob).success).toBe(true);
  });

  it("trims whitespace from name", () => {
    const result = petCreateSchema.safeParse({ ...validPet, name: "  Biscuit  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Biscuit");
  });

  it("rejects microchip_number that is not 15 digits", () => {
    expect(petCreateSchema.safeParse({ ...validPet, microchip_number: "123456" }).success).toBe(false);
  });

  it("rejects microchip_number with non-digit characters", () => {
    expect(petCreateSchema.safeParse({ ...validPet, microchip_number: "ABC123456789012" }).success).toBe(false);
  });

  it("accepts a valid 15-digit microchip number", () => {
    expect(petCreateSchema.safeParse({ ...validPet, microchip_number: "985112345678901" }).success).toBe(true);
  });
});

describe("petUpdateSchema", () => {
  it("accepts partial update with only name", () => {
    expect(petUpdateSchema.safeParse({ name: "Max" }).success).toBe(true);
  });

  it("accepts empty object (no-op update)", () => {
    expect(petUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("rejects invalid type in update", () => {
    expect(petUpdateSchema.safeParse({ type: "fish" }).success).toBe(false);
  });

  it("rejects Bengal cat when type is explicitly included in the patch", () => {
    expect(petUpdateSchema.safeParse({ type: "cat", breed: "Bengal" }).success).toBe(false);
  });

  it("KNOWN LIMITATION: breed-only patch cannot detect existing type=cat in schema alone", () => {
    // A patch of { breed: "Bengal" } passes schema validation because the schema
    // does not know the stored pet type. The API route MUST fetch the record first
    // and enforce the Bengal check server-side using the merged type+breed.
    const result = petUpdateSchema.safeParse({ breed: "Bengal" });
    expect(result.success).toBe(true); // expected — enforcement is at API layer
  });
});
