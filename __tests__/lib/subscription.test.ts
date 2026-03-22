// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase service client before importing subscription lib
vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

import { getUserRole, requireRole, roleAtLeast } from "@/lib/subscription";
import { createServiceClient } from "@/lib/supabase/server";

function makeServiceClient(role: string | null, error = false) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () =>
            error
              ? { data: null, error: { message: "DB error" } }
              : { data: role ? { role } : null, error: null },
        }),
      }),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getUserRole", () => {
  it("returns the role from the profiles table", async () => {
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient("subscriber") as never);
    const role = await getUserRole("user-123");
    expect(role).toBe("subscriber");
  });

  it("returns 'free' when no profile row is found", async () => {
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient(null) as never);
    const role = await getUserRole("user-123");
    expect(role).toBe("free");
  });

  it("returns 'admin' for admin users", async () => {
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient("admin") as never);
    const role = await getUserRole("user-123");
    expect(role).toBe("admin");
  });

  it("returns 'free' on database error (fail-safe)", async () => {
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient(null, true) as never);
    const role = await getUserRole("user-123");
    expect(role).toBe("free");
  });
});

describe("requireRole", () => {
  it("resolves when user has the required role", async () => {
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient("subscriber") as never);
    await expect(requireRole("user-123", "subscriber")).resolves.toBeUndefined();
  });

  it("resolves when user has a higher role than required", async () => {
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient("admin") as never);
    await expect(requireRole("user-123", "subscriber")).resolves.toBeUndefined();
  });

  it("throws 403 when user has a lower role than required", async () => {
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient("free") as never);
    await expect(requireRole("user-123", "subscriber")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("throws 403 for free user trying to access paid_once features", async () => {
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient("free") as never);
    await expect(requireRole("user-123", "paid_once")).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe("requireAdmin", () => {
  it("resolves for admin users", async () => {
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient("admin") as never);
    const { requireAdmin } = await import("@/lib/subscription");
    await expect(requireAdmin("user-123")).resolves.toBeUndefined();
  });

  it("throws 403 for subscriber trying to access admin", async () => {
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient("subscriber") as never);
    const { requireAdmin } = await import("@/lib/subscription");
    await expect(requireAdmin("user-123")).rejects.toMatchObject({ status: 403 });
  });

  it("throws 403 for free user trying to access admin", async () => {
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient("free") as never);
    const { requireAdmin } = await import("@/lib/subscription");
    await expect(requireAdmin("user-123")).rejects.toMatchObject({ status: 403 });
  });
});

describe("roleAtLeast (imported from subscription.ts)", () => {
  it("free >= free", () => expect(roleAtLeast("free", "free")).toBe(true));
  it("paid_once >= free", () => expect(roleAtLeast("paid_once", "free")).toBe(true));
  it("subscriber >= paid_once", () => expect(roleAtLeast("subscriber", "paid_once")).toBe(true));
  it("admin >= subscriber", () => expect(roleAtLeast("admin", "subscriber")).toBe(true));
  it("free < subscriber", () => expect(roleAtLeast("free", "subscriber")).toBe(false));
  it("paid_once < subscriber", () => expect(roleAtLeast("paid_once", "subscriber")).toBe(false));
  it("subscriber < admin", () => expect(roleAtLeast("subscriber", "admin")).toBe(false));
});
