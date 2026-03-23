import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod/v4";
import { getCountryByCode } from "@/lib/countries";
import { DAFF_RULES, getRulesAsContext } from "@/lib/daff-rules";
import type { TimelineInput, TimelineOutput } from "@/types/timeline";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 4096;

// ── Enhanced output schema ────────────────────────────────────────────────────
// Steps and warnings now include sourceUrl so the UI can cite official pages.

const enhancedStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  daysFromNow: z.number().int(),
  category: z.enum(["vaccination", "testing", "documentation", "logistics", "quarantine"]),
  isCompleted: z.literal(false),
  sourceUrl: z.string().url(),
  urgency: z.enum(["immediate", "soon", "planned", "final"]),
  canBeCompletedByOwner: z.boolean(),
  requiresVet: z.boolean(),
  requiresGovernmentPortal: z.boolean(),
  estimatedCostAUD: z.number().nonnegative().nullable(),
  estimatedCost: z
    .object({
      description: z.string(),
      amountAUD: z.number().nonnegative(),
      notes: z.string().optional(),
    })
    .optional(),
});

const enhancedWarningSchema = z.object({
  severity: z.enum(["critical", "warning", "info"]),
  message: z.string().min(1),
  sourceUrl: z.string().url(),
});

const costEstimateSchema = z.object({
  biconPermit: z.number().nonnegative(),
  quarantine: z.number().nonnegative(),
  vetEstimateMin: z.number().nonnegative(),
  vetEstimateMax: z.number().nonnegative(),
  totalMin: z.number().nonnegative(),
  totalMax: z.number().nonnegative(),
  currency: z.literal("AUD"),
  disclaimer: z.string().min(1),
});

const enhancedTimelineOutputSchema = z.object({
  steps: z.array(enhancedStepSchema).min(1),
  warnings: z.array(enhancedWarningSchema),
  totalEstimatedCostAUD: z.number().nonnegative(),
  originGroup: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  quarantineDays: z.number().int().nonnegative(),
  earliestTravelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summary: z.string().min(1),
  daffGroup: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  minimumLeadTimeWeeks: z.number().int().positive(),
  isBreedRestricted: z.boolean(),
  breedRestrictionNote: z.string().nullable(),
  isTravelDateFeasible: z.boolean(),
  travelDateWarning: z.string().nullable(),
  costEstimate: costEstimateSchema,
  disclaimer: z.string().min(1),
  dataLastVerified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  verifyAtUrl: z.string().url(),
});

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  const rulesContext = getRulesAsContext();

  return `You are a DAFF compliance assistant for PetBorder.
Generate timelines using ONLY the rules provided below.
Do NOT use any DAFF knowledge from your training data.
If a rule is not listed below, do not include it.
If you are unsure about anything, say explicitly: 'This may require verification with DAFF directly at https://www.agriculture.gov.au/biosecurity-trade/cats-dogs'
Every step you generate must include the sourceUrl from the rules data.

## Current DAFF Rules (use ONLY these)

${rulesContext}

## Output Format

Return ONLY valid JSON matching this TypeScript type (no markdown, no explanation):

{
  "daffGroup": 1 | 2 | 3,
  "minimumLeadTimeWeeks": number,
  "isBreedRestricted": boolean,
  "breedRestrictionNote": string | null,
  "isTravelDateFeasible": boolean,
  "travelDateWarning": string | null,
  "steps": [
    {
      "stepNumber": number,
      "title": "string",
      "description": "string",
      "dueDate": "YYYY-MM-DD",
      "daysFromNow": number,
      "category": "vaccination|testing|documentation|logistics|quarantine",
      "isCompleted": false,
      "sourceUrl": "string — official DAFF URL for this step",
      "urgency": "immediate|soon|planned|final",
      "canBeCompletedByOwner": boolean,
      "requiresVet": boolean,
      "requiresGovernmentPortal": boolean,
      "estimatedCostAUD": number | null
    }
  ],
  "warnings": [
    {
      "severity": "critical|warning|info",
      "message": "string",
      "sourceUrl": "string — official DAFF URL"
    }
  ],
  "totalEstimatedCostAUD": number,
  "originGroup": 1 | 2 | 3,
  "quarantineDays": number,
  "earliestTravelDate": "YYYY-MM-DD",
  "summary": "string",
  "costEstimate": {
    "biconPermit": number,
    "quarantine": number,
    "vetEstimateMin": number,
    "vetEstimateMax": number,
    "totalMin": number,
    "totalMax": number,
    "currency": "AUD",
    "disclaimer": "string"
  },
  "disclaimer": "This timeline is based on DAFF rules last verified ${DAFF_RULES.lastVerified}. Requirements can change. Always confirm with DAFF at agriculture.gov.au before booking travel for your pet. PetBorder is a planning tool, not legal or veterinary advice.",
  "dataLastVerified": "${DAFF_RULES.lastVerified}",
  "verifyAtUrl": "${DAFF_RULES.sourceUrl}"
}

Rules:
- Set isCompleted: false for all steps
- Order steps chronologically by dueDate
- Every step MUST have sourceUrl pointing to the official DAFF page from the rules above
- Every warning MUST have sourceUrl
- If travel date is impossible due to 180-day RNATT rule: set isTravelDateFeasible: false, add critical warning, set earliestTravelDate to first viable date
- The disclaimer MUST appear exactly as specified above`;
}

function buildUserPrompt(input: TimelineInput, group: number): string {
  const today = new Date().toISOString().split("T")[0];
  return `Generate a DAFF compliance timeline for:
- Pet: ${input.petType}, breed: ${input.petBreed}
- Origin country: ${input.originCountry} (DAFF Group ${group})
- Desired travel date: ${input.travelDate}
- Today's date: ${today}

Calculate exact dates for each step working backwards from the travel date.
Use ONLY the rules provided in the system prompt — do not add rules from your training data.`;
}

// ── Extract JSON from Claude response (handles markdown wrapping) ─────────────

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  // Strip optional markdown code block
  const stripped = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON object found in Claude response");
  return JSON.parse(jsonMatch[0]);
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateTimeline(input: TimelineInput): Promise<TimelineOutput> {
  const country = getCountryByCode(input.originCountry);
  if (!country) {
    throw new Error(`Unknown country code: ${input.originCountry}`);
  }

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(input, country.group);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const textContent = message.content.find((c) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text content in Claude response");
      }

      const parsed = extractJson(textContent.text);
      const result = enhancedTimelineOutputSchema.safeParse(parsed);

      if (!result.success) {
        throw new Error(
          `Claude response failed schema validation: ${JSON.stringify(result.error.issues.slice(0, 3))}`
        );
      }

      return result.data as TimelineOutput;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }

  throw lastError ?? new Error("Failed to generate timeline after 2 attempts");
}
