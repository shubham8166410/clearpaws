import { z } from "zod/v4";

// ── Destination countries for outbound pet travel ─────────────────────────────
//
// Tier 1: Full rules hardcoded in outbound-rules.ts (DESTINATION_RULES)
// Tier 2: Common destinations — AU export steps + authority homepage link
// Tier 3: Less common — AU export steps + generic "contact destination authority"

export interface DestinationCountry {
  code: string;
  name: string;
  tier: 1 | 2 | 3;
}

export const DESTINATION_COUNTRIES: DestinationCountry[] = [
  // ── Tier 1 — Full rules available ─────────────────────────────────────────
  { code: "AE", name: "United Arab Emirates", tier: 1 },
  { code: "CA", name: "Canada", tier: 1 },
  { code: "CH", name: "Switzerland", tier: 1 },
  { code: "DE", name: "Germany", tier: 1 },
  { code: "ES", name: "Spain", tier: 1 },
  { code: "FR", name: "France", tier: 1 },
  { code: "GB", name: "United Kingdom", tier: 1 },
  { code: "HK", name: "Hong Kong", tier: 1 },
  { code: "IE", name: "Ireland", tier: 1 },
  { code: "IT", name: "Italy", tier: 1 },
  { code: "JP", name: "Japan", tier: 1 },
  { code: "NL", name: "Netherlands", tier: 1 },
  { code: "NZ", name: "New Zealand", tier: 1 },
  { code: "SG", name: "Singapore", tier: 1 },
  { code: "US", name: "United States", tier: 1 },

  // ── Tier 2 — EU/common destinations, authority-level guidance ─────────────
  { code: "AT", name: "Austria", tier: 2 },
  { code: "BE", name: "Belgium", tier: 2 },
  { code: "BH", name: "Bahrain", tier: 2 },
  { code: "BG", name: "Bulgaria", tier: 2 },
  { code: "CN", name: "China", tier: 2 },
  { code: "CY", name: "Cyprus", tier: 2 },
  { code: "CZ", name: "Czech Republic", tier: 2 },
  { code: "DK", name: "Denmark", tier: 2 },
  { code: "EE", name: "Estonia", tier: 2 },
  { code: "FI", name: "Finland", tier: 2 },
  { code: "GR", name: "Greece", tier: 2 },
  { code: "HR", name: "Croatia", tier: 2 },
  { code: "HU", name: "Hungary", tier: 2 },
  { code: "ID", name: "Indonesia", tier: 2 },
  { code: "IL", name: "Israel", tier: 2 },
  { code: "IN", name: "India", tier: 2 },
  { code: "JO", name: "Jordan", tier: 2 },
  { code: "KR", name: "South Korea", tier: 2 },
  { code: "KW", name: "Kuwait", tier: 2 },
  { code: "LT", name: "Lithuania", tier: 2 },
  { code: "LU", name: "Luxembourg", tier: 2 },
  { code: "LV", name: "Latvia", tier: 2 },
  { code: "MT", name: "Malta", tier: 2 },
  { code: "MY", name: "Malaysia", tier: 2 },
  { code: "OM", name: "Oman", tier: 2 },
  { code: "PH", name: "Philippines", tier: 2 },
  { code: "PL", name: "Poland", tier: 2 },
  { code: "PT", name: "Portugal", tier: 2 },
  { code: "QA", name: "Qatar", tier: 2 },
  { code: "RO", name: "Romania", tier: 2 },
  { code: "SA", name: "Saudi Arabia", tier: 2 },
  { code: "SE", name: "Sweden", tier: 2 },
  { code: "SI", name: "Slovenia", tier: 2 },
  { code: "SK", name: "Slovakia", tier: 2 },
  { code: "TH", name: "Thailand", tier: 2 },
  { code: "TR", name: "Turkey", tier: 2 },
  { code: "TW", name: "Taiwan", tier: 2 },
  { code: "VN", name: "Vietnam", tier: 2 },
  { code: "ZA", name: "South Africa", tier: 2 },

  // ── Tier 3 — General guidance only ────────────────────────────────────────
  { code: "AR", name: "Argentina", tier: 3 },
  { code: "BD", name: "Bangladesh", tier: 3 },
  { code: "BO", name: "Bolivia", tier: 3 },
  { code: "BR", name: "Brazil", tier: 3 },
  { code: "CL", name: "Chile", tier: 3 },
  { code: "CO", name: "Colombia", tier: 3 },
  { code: "EG", name: "Egypt", tier: 3 },
  { code: "FJ", name: "Fiji", tier: 3 },
  { code: "GH", name: "Ghana", tier: 3 },
  { code: "KE", name: "Kenya", tier: 3 },
  { code: "LK", name: "Sri Lanka", tier: 3 },
  { code: "MX", name: "Mexico", tier: 3 },
  { code: "NG", name: "Nigeria", tier: 3 },
  { code: "NP", name: "Nepal", tier: 3 },
  { code: "PE", name: "Peru", tier: 3 },
  { code: "PG", name: "Papua New Guinea", tier: 3 },
  { code: "PK", name: "Pakistan", tier: 3 },
  { code: "TO", name: "Tonga", tier: 3 },
  { code: "UY", name: "Uruguay", tier: 3 },
  { code: "WS", name: "Samoa", tier: 3 },
];

// Sorted by name for the dropdown
DESTINATION_COUNTRIES.sort((a, b) => a.name.localeCompare(b.name));

const VALID_CODES = new Set(DESTINATION_COUNTRIES.map((c) => c.code));

// ── Input schema ──────────────────────────────────────────────────────────────

export const outboundInputSchema = z.object({
  petType: z.enum(["dog", "cat"]),

  petBreed: z
    .string()
    .trim()
    .min(1, "Pet breed is required")
    .max(100, "Pet breed must be 100 characters or less"),

  destinationCountry: z
    .string()
    .min(1, "Destination country is required")
    .refine((code) => VALID_CODES.has(code), {
      message: "Please select a valid destination country",
    }),

  departureDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Departure date must be in YYYY-MM-DD format")
    .refine(
      (date) => {
        const departure = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return departure > today;
      },
      { message: "Departure date must be in the future" }
    )
    .refine(
      (date) => {
        const departure = new Date(date);
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 2);
        return departure <= maxDate;
      },
      { message: "Departure date must be within the next 2 years" }
    ),

  isAlreadyMicrochipped: z.boolean({
    message: "Please specify if your pet is already microchipped",
  }),
});

export type OutboundInput = z.infer<typeof outboundInputSchema>;

// ── API response types ────────────────────────────────────────────────────────

export interface OutboundStepResponse {
  id: string;
  section: "au-export" | "destination";
  title: string;
  description: string;
  calculatedDate: string; // YYYY-MM-DD
  sourceUrl: string;
  isVerified: boolean;
  estimatedCostAUD: number | null;
  alreadyComplete: boolean;
}

export interface OutboundTimelineResponse {
  destinationCode: string;
  destinationName: string;
  petType: "dog" | "cat";
  departureDate: string; // YYYY-MM-DD
  tier: 1 | 2 | 3;
  hasLongLeadTimeWarning: boolean;
  steps: OutboundStepResponse[];
  lastVerified: string;
  disclaimer: string;
}
