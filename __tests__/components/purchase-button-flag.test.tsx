/**
 * Tests for Issue 3 — payments feature flag.
 *
 * When NEXT_PUBLIC_PAYMENTS_ENABLED is not "true", the purchase button
 * must be visually disabled with a "Coming Soon" badge and must not
 * allow clicks. The original button code must be preserved (flag only
 * controls rendering).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import { PurchaseButton } from "@/components/dashboard/PurchaseButton";

describe("PurchaseButton — payments feature flag", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  describe("when NEXT_PUBLIC_PAYMENTS_ENABLED is not set (default off)", () => {
    beforeEach(() => {
      process.env = { ...originalEnv, NEXT_PUBLIC_PAYMENTS_ENABLED: undefined };
    });

    it("renders a disabled button", () => {
      render(<PurchaseButton timelineId="t1" hasPurchase={false} />);
      const btn = screen.getByRole("button", { name: /download document pack/i });
      expect(btn).toBeDisabled();
    });

    it("shows 'Coming Soon' badge", () => {
      render(<PurchaseButton timelineId="t1" hasPurchase={false} />);
      expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    });

    it("button has aria-disabled attribute", () => {
      render(<PurchaseButton timelineId="t1" hasPurchase={false} />);
      const btn = screen.getByRole("button", { name: /download document pack/i });
      expect(btn).toHaveAttribute("aria-disabled", "true");
    });

    it("clicking the disabled button does NOT call fetch", () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      render(<PurchaseButton timelineId="t1" hasPurchase={false} />);
      fireEvent.click(screen.getByRole("button", { name: /download document pack/i }));
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("shows descriptive 'launching soon' helper text", () => {
      render(<PurchaseButton timelineId="t1" hasPurchase={false} />);
      expect(screen.getByText(/launching soon/i)).toBeInTheDocument();
    });
  });

  describe("when NEXT_PUBLIC_PAYMENTS_ENABLED is 'false'", () => {
    beforeEach(() => {
      process.env = { ...originalEnv, NEXT_PUBLIC_PAYMENTS_ENABLED: "false" };
    });

    it("renders the disabled coming-soon button", () => {
      render(<PurchaseButton timelineId="t1" hasPurchase={false} />);
      expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /download document pack/i })).toBeDisabled();
    });
  });

  describe("when NEXT_PUBLIC_PAYMENTS_ENABLED is 'true'", () => {
    beforeEach(() => {
      process.env = { ...originalEnv, NEXT_PUBLIC_PAYMENTS_ENABLED: "true" };
    });

    it("renders the live 'Buy document pack' button (payments enabled)", () => {
      vi.stubGlobal("fetch", vi.fn());
      render(<PurchaseButton timelineId="t1" hasPurchase={false} />);
      // Should show the real purchase button
      expect(screen.getByRole("button", { name: /buy document pack/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /buy document pack/i })).not.toBeDisabled();
    });

    it("does NOT show 'Coming Soon' badge when payments enabled", () => {
      vi.stubGlobal("fetch", vi.fn());
      render(<PurchaseButton timelineId="t1" hasPurchase={false} />);
      expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    });
  });

  describe("hasPurchase=true (already purchased — unaffected by flag)", () => {
    it("shows download link regardless of flag", () => {
      process.env = { ...originalEnv, NEXT_PUBLIC_PAYMENTS_ENABLED: "false" };
      render(<PurchaseButton timelineId="t1" hasPurchase={true} />);
      expect(screen.getByText(/document pack purchased/i)).toBeInTheDocument();
      expect(screen.getByText("Download PDF")).toBeInTheDocument();
    });
  });
});
