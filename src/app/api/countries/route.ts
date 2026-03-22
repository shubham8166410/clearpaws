import { NextRequest, NextResponse } from "next/server";
import {
  getAllCountries,
  getCountriesByGroup,
  searchCountries,
} from "@/lib/countries";
import type { DaffGroup } from "@/types/timeline";

export function GET(req: NextRequest): NextResponse {
  const { searchParams } = new URL(req.url);
  const groupParam = searchParams.get("group");
  const searchParam = searchParams.get("search");

  let countries = getAllCountries();

  if (searchParam) {
    countries = searchCountries(searchParam);
  } else if (groupParam) {
    const group = parseInt(groupParam, 10);
    if (group === 1 || group === 2 || group === 3) {
      countries = getCountriesByGroup(group as DaffGroup);
    }
  }

  return NextResponse.json(countries);
}
