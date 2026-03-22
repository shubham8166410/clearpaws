import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-middleware";
import { createServiceClient } from "@/lib/supabase/server";
import { getAllCountries } from "@/lib/countries";
import type { ApiSuccessResponse } from "@/types/api";
import type { Country } from "@/types/timeline";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const serviceClient = createServiceClient();

  // 1. Authenticate API key
  const auth = await authenticateApiKey(req, serviceClient);
  if (auth instanceof NextResponse) return auth;

  // 2. Return all countries
  const countries = getAllCountries();

  const body: ApiSuccessResponse<Country[]> = {
    success: true,
    data: countries,
  };

  return NextResponse.json(body, {
    status: 200,
    headers: auth.rateLimitHeaders,
  });
}
