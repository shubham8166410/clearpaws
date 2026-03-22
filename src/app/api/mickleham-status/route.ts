import { NextResponse } from "next/server";
import { getQuarantineStatus } from "@/lib/mickleham";

/**
 * GET /api/mickleham-status
 * Returns live Mickleham quarantine availability (24h cached).
 * Public endpoint — no auth required (status is public information).
 */
export async function GET(): Promise<NextResponse> {
  const status = await getQuarantineStatus();
  return NextResponse.json(status);
}
