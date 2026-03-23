import { z } from "zod/v4";

// ── Outbound Rules Knowledge Base ─────────────────────────────────────────────
//
// This file is the single source of truth for all outbound pet travel rules.
// It is injected into every Claude API call — the AI never guesses from training.
//
// Two-layer structure:
//   1. AUSTRALIA_EXPORT_PROCESS — fixed DAFF steps every Australian must complete
//   2. DESTINATION_RULES — per-country import requirements for 15 Tier 1 countries
//
// Tier classification:
//   Tier 1 — Full rules hardcoded, all steps verified, sourceUrl confirmed
//   Tier 2 — AU export steps only + official authority homepage link (unverified details)
//   Tier 3 — AU export steps only + generic "contact destination authority" guidance
//
// Source: https://www.agriculture.gov.au/biosecurity-trade/export/controlled-goods/live-animals/companion-and-other-live-animals
// Last verified: 2026-03-22

// ── TypeScript types ──────────────────────────────────────────────────────────

export interface MicrochipRequirement {
  required: boolean;
  standard: string; // e.g. "ISO 11784/11785"
  mustBeBeforeRabiesVaccine: boolean;
  notes: string[];
}

export interface VaccineRequirement {
  rabiesRequired: boolean;
  otherRequired: string[];
  notes: string[];
}

export interface TiterTestRequirement {
  required: boolean;
  waitDaysAfterTest: number; // 0 if not required
  approvedLabs: string[];
  notes: string[];
}

export interface TapewormRequirement {
  requiredForDogs: boolean;
  requiredForCats: boolean;
  activeIngredient: string | null;
  minHoursBeforeEntry: number | null;
  maxHoursBeforeEntry: number | null;
  notes: string[];
}

export interface QuarantineRequirement {
  required: boolean;
  durationDays: number; // 0 if not required
  facilityName: string | null;
  notes: string[];
}

export interface HealthCertRequirement {
  required: boolean;
  validityDaysDog: number; // days from vet inspection to entry
  validityDaysCat: number;
  issuingAuthority: string;
  notes: string[];
}

export interface ImportPermitRequirement {
  required: boolean;
  cost: number | null; // AUD
  currency: "AUD" | null;
  notes: string[];
}

export interface BannedBreedEntry {
  breed: string;
  notes: string;
}

export interface DestinationRules {
  tier: 1 | 2 | 3;
  countryName: string;
  sourceUrl: string;
  sourceUrlVerified: "page" | "authority"; // "authority" = homepage only, deep link unconfirmed
  lastVerified: string; // YYYY-MM-DD
  microchip: MicrochipRequirement;
  rabiesVaccine: VaccineRequirement;
  titerTest: TiterTestRequirement;
  tapeworm: TapewormRequirement;
  healthCertificate: HealthCertRequirement;
  quarantine: QuarantineRequirement;
  importPermit: ImportPermitRequirement;
  bannedBreeds: BannedBreedEntry[];
  estimatedLeadTimeWeeks: number;
  advanceNoticeHours: number | null; // null if not required
  advanceNoticeRequired: boolean;
  officialContact: string;
  notes: string[];
}

export interface AuExportStep {
  id: string;
  title: string;
  description: string;
  sourceUrl: string;
  lastVerified: string;
  estimatedCostAUD: number | null;
  timingDescription: string;
  // 72-hour window fields (only on daff-export-permit step)
  permitWindowHours?: number;
  // NOI fields
  minBusinessDaysBeforeDeparture?: number;
}

export interface AustraliaExportProcess {
  lastVerified: string;
  sourceUrl: string;
  steps: AuExportStep[];
}

export interface OutboundStep {
  id: string;
  section: "au-export" | "destination";
  title: string;
  description: string;
  calculatedDate: Date;
  sourceUrl: string;
  isVerified: boolean;
  estimatedCostAUD: number | null;
  alreadyComplete: boolean;
}

export interface OutboundTimeline {
  destinationCode: string;
  destinationName: string;
  petType: "dog" | "cat";
  departureDate: Date;
  tier: 1 | 2 | 3;
  hasLongLeadTimeWarning: boolean;
  steps: OutboundStep[];
  lastVerified: string;
  disclaimer: string;
}

export interface GetOutboundTimelineInput {
  destinationCode: string;
  petType: "dog" | "cat";
  departureDate: Date;
  isAlreadyMicrochipped: boolean;
}

// ── AUSTRALIA_EXPORT_PROCESS ──────────────────────────────────────────────────

export const AUSTRALIA_EXPORT_PROCESS: AustraliaExportProcess = {
  lastVerified: "2026-03-22",
  sourceUrl:
    "https://www.agriculture.gov.au/biosecurity-trade/export/controlled-goods/live-animals/companion-and-other-live-animals",

  steps: [
    {
      id: "au-microchip",
      title: "Verify microchip compliance",
      description:
        "Your pet must have an ISO 11784/11785-compliant microchip implanted BEFORE any rabies vaccination or blood sampling. If your pet is already microchipped, verify the chip is ISO compliant and that it was implanted before all vaccinations.",
      sourceUrl:
        "https://www.agriculture.gov.au/biosecurity-trade/export/controlled-goods/live-animals/companion-and-other-live-animals",
      lastVerified: "2026-03-22",
      estimatedCostAUD: 60,
      timingDescription: "Complete before any vaccinations — ideally 8+ weeks before departure",
    },
    {
      id: "au-rabies-vaccine",
      title: "Rabies vaccination",
      description:
        "Most destination countries require a current rabies vaccination. The vaccine must be administered after microchipping. Keep the vaccination certificate as it will be required for the health certificate and may be required at the destination border.",
      sourceUrl:
        "https://www.agriculture.gov.au/biosecurity-trade/export/controlled-goods/live-animals/companion-and-other-live-animals",
      lastVerified: "2026-03-22",
      estimatedCostAUD: 80,
      timingDescription: "After microchipping — timing depends on destination requirements",
    },
    {
      id: "daff-noi",
      title: "Lodge Notice of Intention (NOI) with DAFF",
      description:
        "You must lodge a Notice of Intention to export your pet with the Department of Agriculture, Fisheries and Forestry (DAFF) at least 10 business days before your departure date. Lodge online via the DAFF export system.",
      sourceUrl:
        "https://www.agriculture.gov.au/biosecurity-trade/export/controlled-goods/live-animals/companion-and-other-live-animals/lodging-notice-of-intention",
      lastVerified: "2026-03-22",
      estimatedCostAUD: null,
      timingDescription: "At least 10 business days before departure",
      minBusinessDaysBeforeDeparture: 10,
    },
    {
      id: "au-vet-health-cert",
      title: "Pre-export veterinary health inspection",
      description:
        "A DAFF-accredited veterinarian must inspect your pet and issue an Australian veterinary health certificate. This must be completed before your DAFF export permit appointment. The vet will confirm your pet is fit to travel, vaccinations are current, and microchip is compliant.",
      sourceUrl:
        "https://www.agriculture.gov.au/biosecurity-trade/export/controlled-goods/live-animals/companion-and-other-live-animals",
      lastVerified: "2026-03-22",
      estimatedCostAUD: 200,
      timingDescription: "Typically 3–5 days before departure, before DAFF permit appointment",
    },
    {
      id: "daff-export-permit",
      title: "Obtain DAFF export permit",
      description:
        "DAFF issues the official export permit after inspecting your pet and verifying all documentation. CRITICAL: The export permit is valid for 72 hours from the time of issue. Your departure must occur within this 72-hour window. For a Monday departure, your DAFF appointment must be Thursday or Friday.",
      sourceUrl:
        "https://www.agriculture.gov.au/biosecurity-trade/export/controlled-goods/live-animals/companion-and-other-live-animals/export-permit",
      lastVerified: "2026-03-22",
      estimatedCostAUD: 110,
      timingDescription: "Within 72 hours before departure — book DAFF appointment accordingly",
      permitWindowHours: 72,
    },
  ],
};

// ── DESTINATION_RULES ─────────────────────────────────────────────────────────

export const DESTINATION_RULES: Record<string, DestinationRules> = {
  // ── United Kingdom ──────────────────────────────────────────────────────────
  GB: {
    tier: 1,
    countryName: "United Kingdom",
    sourceUrl: "https://www.gov.uk/bring-pet-to-great-britain",
    sourceUrlVerified: "page",
    lastVerified: "2026-03-22",
    microchip: {
      required: true,
      standard: "ISO 11784/11785",
      mustBeBeforeRabiesVaccine: true,
      notes: ["Australia meets the UK listed country standard — same ISO requirement applies"],
    },
    rabiesVaccine: {
      rabiesRequired: true,
      otherRequired: [],
      notes: ["Must be administered after microchipping"],
    },
    titerTest: {
      required: false,
      waitDaysAfterTest: 0,
      approvedLabs: [],
      notes: [
        "Australia is a 'Part 1 listed country' — NO titer test (blood test) is required",
        "This is significantly simpler than non-listed countries which require a 3-month wait after titer test",
      ],
    },
    tapeworm: {
      requiredForDogs: true,
      requiredForCats: false,
      activeIngredient: "praziquantel",
      minHoursBeforeEntry: 24,
      maxHoursBeforeEntry: 120,
      notes: [
        "Dogs ONLY — cats are exempt",
        "Must be administered by a vet and recorded in the health certificate",
        "Treatment window is 24 to 120 hours (1 to 5 days) before arrival in the UK",
        "Commonly missed — plan this carefully around your travel date",
      ],
    },
    healthCertificate: {
      required: true,
      validityDaysDog: 5,
      validityDaysCat: 10,
      issuingAuthority: "DAFF-accredited veterinarian (Australian official vet)",
      notes: [
        "Dogs: vet inspection must be within 5 days of arrival in the UK",
        "Cats: vet inspection must be within 10 days of arrival in the UK",
        "The 'validity' is measured from vet inspection date to UK arrival date, not issue date",
      ],
    },
    quarantine: {
      required: false,
      durationDays: 0,
      facilityName: null,
      notes: [
        "Australia is a UK 'Part 1 listed country' — NO quarantine required on arrival",
        "Pets enter directly after border checks",
      ],
    },
    importPermit: {
      required: false,
      cost: null,
      currency: null,
      notes: ["No import permit required from Australia"],
    },
    bannedBreeds: [
      { breed: "Pit Bull Terrier", notes: "Banned under UK Dangerous Dogs Act 1991" },
      { breed: "Japanese Tosa", notes: "Banned under UK Dangerous Dogs Act 1991" },
      { breed: "Dogo Argentino", notes: "Banned under UK Dangerous Dogs Act 1991" },
      { breed: "Fila Brasileiro", notes: "Banned under UK Dangerous Dogs Act 1991" },
      { breed: "XL Bully", notes: "Banned in UK from February 2024" },
    ],
    estimatedLeadTimeWeeks: 8,
    advanceNoticeHours: null,
    advanceNoticeRequired: false,
    officialContact: "www.gov.uk/bring-pet-to-great-britain",
    notes: [
      "Australia is a UK 'Part 1 listed country' — the most favourable entry category",
      "The tapeworm treatment for dogs is the most commonly missed requirement — do not overlook it",
    ],
  },

  // ── United States ───────────────────────────────────────────────────────────
  US: {
    tier: 1,
    countryName: "United States",
    sourceUrl: "https://www.aphis.usda.gov/pet-travel",
    sourceUrlVerified: "page",
    lastVerified: "2026-03-22",
    microchip: {
      required: false,
      standard: "ISO 11784/11785 recommended",
      mustBeBeforeRabiesVaccine: false,
      notes: [
        "Microchip is not federally required by USDA for entry but is strongly recommended",
        "Individual states may have their own requirements",
      ],
    },
    rabiesVaccine: {
      rabiesRequired: true,
      otherRequired: [],
      notes: [
        "Dogs must have a current rabies vaccination",
        "CDC requires all dogs be vaccinated against rabies",
      ],
    },
    titerTest: {
      required: false,
      waitDaysAfterTest: 0,
      approvedLabs: [],
      notes: ["No titer test required from Australia"],
    },
    tapeworm: {
      requiredForDogs: false,
      requiredForCats: false,
      activeIngredient: null,
      minHoursBeforeEntry: null,
      maxHoursBeforeEntry: null,
      notes: [],
    },
    healthCertificate: {
      required: true,
      validityDaysDog: 10,
      validityDaysCat: 10,
      issuingAuthority: "Licensed veterinarian",
      notes: ["Health certificate must be issued within 10 days of arrival"],
    },
    quarantine: {
      required: false,
      durationDays: 0,
      facilityName: null,
      notes: ["No quarantine required from Australia"],
    },
    importPermit: {
      required: false,
      cost: null,
      currency: null,
      notes: ["No import permit required for dogs or cats from Australia"],
    },
    bannedBreeds: [],
    estimatedLeadTimeWeeks: 6,
    advanceNoticeHours: null,
    advanceNoticeRequired: false,
    officialContact: "www.aphis.usda.gov/pet-travel",
    notes: [
      "Australia is a CDC screwworm-free country — dogs do not require the USDA screwworm inspection that applies to many other countries",
      "Check your specific US state's requirements as they can be stricter than federal requirements",
      "CDC dog import rules updated 2024 — verify current requirements at cdc.gov/importation/dogs",
    ],
  },

  // ── New Zealand ─────────────────────────────────────────────────────────────
  NZ: {
    tier: 1,
    countryName: "New Zealand",
    sourceUrl: "https://www.mpi.govt.nz/importing-exporting-and-biosecurity/bringing-cats-and-dogs-to-nz/",
    sourceUrlVerified: "page",
    lastVerified: "2026-03-22",
    microchip: {
      required: true,
      standard: "ISO 11784/11785",
      mustBeBeforeRabiesVaccine: true,
      notes: ["Microchip must be implanted before any vaccinations"],
    },
    rabiesVaccine: {
      rabiesRequired: false,
      otherRequired: [],
      notes: [
        "Rabies vaccination is NOT required from Australia — Australia is rabies-free",
        "Other vaccinations (distemper, parvovirus etc.) are recommended but not required for entry",
      ],
    },
    titerTest: {
      required: false,
      waitDaysAfterTest: 0,
      approvedLabs: [],
      notes: [
        "No titer test required from Australia — Australia is a Category 1 country for NZ import",
      ],
    },
    tapeworm: {
      requiredForDogs: false,
      requiredForCats: false,
      activeIngredient: null,
      minHoursBeforeEntry: null,
      maxHoursBeforeEntry: null,
      notes: [],
    },
    healthCertificate: {
      required: true,
      validityDaysDog: 7,
      validityDaysCat: 7,
      issuingAuthority: "DAFF-accredited veterinarian",
      notes: ["Health certificate must be completed within 7 days of departure from Australia"],
    },
    quarantine: {
      required: true,
      durationDays: 10,
      facilityName: "MPI Managed Isolation Facility",
      notes: [
        "10-day quarantine is ALWAYS required even from Australia despite Category 1 status",
        "Must book and pay for quarantine in advance — spaces are limited",
        "Quarantine costs apply — check current fees with MPI",
      ],
    },
    importPermit: {
      required: false,
      cost: null,
      currency: null,
      notes: ["No import permit required from Australia (Category 1 country)"],
    },
    bannedBreeds: [
      { breed: "American Pit Bull Terrier", notes: "Banned under NZ Dog Control Act" },
      { breed: "Dogo Argentino", notes: "Banned under NZ Dog Control Act" },
      { breed: "Brazilian Fila", notes: "Banned under NZ Dog Control Act" },
      { breed: "Japanese Tosa", notes: "Banned under NZ Dog Control Act" },
    ],
    estimatedLeadTimeWeeks: 10,
    advanceNoticeHours: 72,
    advanceNoticeRequired: true,
    officialContact: "www.mpi.govt.nz",
    notes: [
      "Despite being one of the easiest countries from Australia, quarantine is still mandatory",
      "Notify MPI at least 72 hours before your pet arrives",
      "Australia is a Category 1 country — the most favourable NZ entry category",
    ],
  },

  // ── Canada ──────────────────────────────────────────────────────────────────
  CA: {
    tier: 1,
    countryName: "Canada",
    sourceUrl: "https://inspection.canada.ca/en/importing-food-plants-animals/pets",
    sourceUrlVerified: "page",
    lastVerified: "2026-03-22",
    microchip: {
      required: false,
      standard: "ISO 11784/11785 recommended",
      mustBeBeforeRabiesVaccine: false,
      notes: ["Microchip not required by CFIA but strongly recommended"],
    },
    rabiesVaccine: {
      rabiesRequired: true,
      otherRequired: [],
      notes: [
        "Dogs must have a valid rabies vaccination",
        "Certificate must show date of vaccination and expiry date",
      ],
    },
    titerTest: {
      required: false,
      waitDaysAfterTest: 0,
      approvedLabs: [],
      notes: ["No titer test required from Australia"],
    },
    tapeworm: {
      requiredForDogs: false,
      requiredForCats: false,
      activeIngredient: null,
      minHoursBeforeEntry: null,
      maxHoursBeforeEntry: null,
      notes: [],
    },
    healthCertificate: {
      required: true,
      validityDaysDog: 30,
      validityDaysCat: 30,
      issuingAuthority: "Licensed veterinarian",
      notes: ["Health certificate valid for 30 days from date of issue"],
    },
    quarantine: {
      required: false,
      durationDays: 0,
      facilityName: null,
      notes: ["No quarantine required from Australia"],
    },
    importPermit: {
      required: false,
      cost: null,
      currency: null,
      notes: ["No import permit required for pet dogs or cats from Australia"],
    },
    bannedBreeds: [],
    estimatedLeadTimeWeeks: 6,
    advanceNoticeHours: null,
    advanceNoticeRequired: false,
    officialContact: "inspection.canada.ca",
    notes: [
      "Some Canadian provinces have breed-specific legislation — check provincial rules for your destination province",
      "Quebec and Ontario both have or have had restrictions on certain breeds",
    ],
  },

  // ── Singapore ───────────────────────────────────────────────────────────────
  SG: {
    tier: 1,
    countryName: "Singapore",
    sourceUrl: "https://www.nparks.gov.sg/avs/pets/bringing-animals-into-singapore-and-exporting/bringing-in-and-transshipping-dogs-and-cats",
    sourceUrlVerified: "page",
    lastVerified: "2026-03-22",
    microchip: {
      required: true,
      standard: "ISO 11784/11785, AVID, or FECAVA",
      mustBeBeforeRabiesVaccine: true,
      notes: [
        "Singapore accepts ISO 11784/11785 AND also AVID (10-digit) and FECAVA standards",
        "Verify your microchip meets one of these standards — this catches many Australian pet owners",
        "Microchip must be implanted before any vaccinations",
      ],
    },
    rabiesVaccine: {
      rabiesRequired: true,
      otherRequired: ["Distemper", "Hepatitis", "Parvovirus", "Parainfluenza", "Leptospirosis"],
      notes: [
        "Core vaccines required: DA2PPL (or equivalent) for dogs",
        "Feline core vaccines required for cats",
        "All vaccines must be current at time of import",
      ],
    },
    titerTest: {
      required: true,
      waitDaysAfterTest: 0,
      approvedLabs: ["Singapore-approved laboratories"],
      notes: [
        "Rabies titer test (FAVN or RFFIT) required from Australia",
        "Test must be performed at an AVS-approved laboratory",
        "Result must be ≥0.5 IU/ml",
        "No mandatory wait period after passing titer test for dogs from Australia",
      ],
    },
    tapeworm: {
      requiredForDogs: false,
      requiredForCats: false,
      activeIngredient: null,
      minHoursBeforeEntry: null,
      maxHoursBeforeEntry: null,
      notes: [],
    },
    healthCertificate: {
      required: true,
      validityDaysDog: 7,
      validityDaysCat: 7,
      issuingAuthority: "DAFF-accredited veterinarian (official government vet)",
      notes: ["Health certificate must be issued within 7 days of departure"],
    },
    quarantine: {
      required: true,
      durationDays: 10,
      facilityName: "AVS-approved quarantine facility",
      notes: [
        "10-day quarantine required on arrival",
        "Must use an AVS-approved quarantine facility — pre-book before travel",
        "Quarantine costs are significant — check current fees with AVS",
      ],
    },
    importPermit: {
      required: true,
      cost: null,
      currency: null,
      notes: [
        "Import permit required from AVS (Animal & Veterinary Service)",
        "Apply via the GoBusiness Licensing Portal before travel",
        "Permit must be obtained before the pet departs Australia",
      ],
    },
    bannedBreeds: [
      { breed: "Pit Bull Terrier", notes: "Banned in Singapore" },
      { breed: "Akita Inu", notes: "Banned in Singapore" },
      { breed: "Boerboel", notes: "Banned in Singapore" },
      { breed: "Dogo Argentino", notes: "Banned in Singapore" },
      { breed: "Fila Brasileiro", notes: "Banned in Singapore" },
      { breed: "Japanese Tosa", notes: "Banned in Singapore" },
      { breed: "Neapolitan Mastiff", notes: "Banned in Singapore" },
      { breed: "Perro de Presa Canario", notes: "Banned in Singapore" },
    ],
    estimatedLeadTimeWeeks: 16,
    advanceNoticeHours: null,
    advanceNoticeRequired: false,
    officialContact: "www.nparks.gov.sg/avs",
    notes: [
      "Singapore requires AVID or FECAVA microchip standards in addition to ISO — verify chip compatibility before travel",
      "The titer test and quarantine make Singapore one of the more involved destinations from Australia",
      "Apply for the import permit well in advance — processing takes time",
    ],
  },

  // ── Japan ───────────────────────────────────────────────────────────────────
  JP: {
    tier: 1,
    countryName: "Japan",
    sourceUrl: "https://www.maff.go.jp/aqs/animal/dog/import-other.html",
    sourceUrlVerified: "page",
    lastVerified: "2026-03-22",
    microchip: {
      required: true,
      standard: "ISO 11784/11785",
      mustBeBeforeRabiesVaccine: true,
      notes: ["Microchip must be implanted before primary rabies vaccination"],
    },
    rabiesVaccine: {
      rabiesRequired: true,
      otherRequired: [],
      notes: [
        "Two rabies vaccinations required — primary and booster",
        "Booster must be given after primary and before titer test",
        "All vaccinations must be after microchipping",
      ],
    },
    titerTest: {
      required: true,
      waitDaysAfterTest: 180,
      approvedLabs: ["National Institute of Infectious Diseases (Japan)", "Agriculture Victoria (Australia)", "Other MAFF-approved labs"],
      notes: [
        "Rabies neutralising antibody titer test required — result must be ≥0.5 IU/ml",
        "180-day mandatory wait AFTER the blood sample is taken (not after the result is received)",
        "This is the primary driver of Japan's 6+ month minimum lead time",
        "Test must be performed at a MAFF-approved laboratory",
        "Australia has MAFF-approved labs — check current list at maff.go.jp",
      ],
    },
    tapeworm: {
      requiredForDogs: false,
      requiredForCats: false,
      activeIngredient: null,
      minHoursBeforeEntry: null,
      maxHoursBeforeEntry: null,
      notes: [],
    },
    healthCertificate: {
      required: true,
      validityDaysDog: 7,
      validityDaysCat: 7,
      issuingAuthority: "DAFF-accredited official veterinarian",
      notes: [
        "Official export health certificate must be issued within 7 days of departure",
        "Certificate must include all vaccination records and titer test result",
      ],
    },
    quarantine: {
      required: true,
      durationDays: 12,
      facilityName: "Animal Quarantine Service (AQS) facility",
      notes: [
        "Minimum 12 hours quarantine, but typically 12 days if all paperwork is complete",
        "Quarantine can extend significantly if documentation is incomplete",
        "Must give advance notice to the quarantine station before travel",
      ],
    },
    importPermit: {
      required: false,
      cost: null,
      currency: null,
      notes: ["No formal import permit required but advance notice to quarantine station is mandatory"],
    },
    bannedBreeds: [],
    estimatedLeadTimeWeeks: 32,
    advanceNoticeHours: 168, // 7 days
    advanceNoticeRequired: true,
    officialContact: "www.maff.go.jp/aqs",
    notes: [
      "Japan has one of the world's strictest pet import processes — even from Australia",
      "The 180-day wait after titer test means minimum preparation time is 6 months",
      "Must notify the Animal Quarantine Service (AQS) at least 40 days before arrival — earlier is better",
      "Failure to complete all steps correctly results in extended quarantine (up to 180 days)",
      "Plan at least 7–8 months ahead to be safe",
    ],
  },

  // ── UAE ─────────────────────────────────────────────────────────────────────
  AE: {
    tier: 1,
    countryName: "United Arab Emirates",
    sourceUrl: "https://www.moccae.gov.ae",
    sourceUrlVerified: "authority", // Deep link to specific page requires manual QA verification
    lastVerified: "2026-03-22",
    microchip: {
      required: true,
      standard: "ISO 11784/11785",
      mustBeBeforeRabiesVaccine: true,
      notes: ["ISO microchip required — verify chip reads correctly before travel"],
    },
    rabiesVaccine: {
      rabiesRequired: true,
      otherRequired: [],
      notes: [
        "Valid rabies vaccination certificate required",
        "Vaccination must be administered after microchipping",
      ],
    },
    titerTest: {
      required: true,
      waitDaysAfterTest: 0,
      approvedLabs: [],
      notes: [
        "Rabies titer test required — result must show adequate antibody levels",
        "Verify current approved laboratory requirements with MOCCAE before testing",
      ],
    },
    tapeworm: {
      requiredForDogs: false,
      requiredForCats: false,
      activeIngredient: null,
      minHoursBeforeEntry: null,
      maxHoursBeforeEntry: null,
      notes: [],
    },
    healthCertificate: {
      required: true,
      validityDaysDog: 14,
      validityDaysCat: 14,
      issuingAuthority: "DAFF-accredited official veterinarian",
      notes: [
        "Health certificate must be endorsed by DAFF",
        "Verify current validity window with MOCCAE — UAE requirements can change",
      ],
    },
    quarantine: {
      required: false,
      durationDays: 0,
      facilityName: null,
      notes: [
        "Generally no quarantine required from Australia but verify current rules with MOCCAE",
        "Individual Emirates (Dubai, Abu Dhabi, Sharjah) may have additional local requirements",
      ],
    },
    importPermit: {
      required: true,
      cost: null,
      currency: null,
      notes: [
        "Import permit required from MOCCAE (Ministry of Climate Change and Environment)",
        "Apply via the MOCCAE digital services portal before travel",
        "Permit must be obtained before the pet departs Australia",
      ],
    },
    bannedBreeds: [
      { breed: "Pit Bull Terrier", notes: "Banned in UAE" },
      { breed: "Rottweiler", notes: "Banned in some UAE Emirates" },
      { breed: "Staffordshire Bull Terrier", notes: "Banned in UAE" },
      { breed: "American Staffordshire Terrier", notes: "Banned in UAE" },
      { breed: "Dogo Argentino", notes: "Banned in UAE" },
      { breed: "Fila Brasileiro", notes: "Banned in UAE" },
      { breed: "Japanese Tosa", notes: "Banned in UAE" },
    ],
    estimatedLeadTimeWeeks: 12,
    advanceNoticeHours: null,
    advanceNoticeRequired: false,
    officialContact: "www.moccae.gov.ae",
    notes: [
      "NOTE: UAE sourceUrl is confirmed to authority level (moccae.gov.ae) only — the exact pet import page requires manual QA verification before launch",
      "Individual UAE Emirates (Dubai, Abu Dhabi) may have additional requirements beyond federal MOCCAE rules — check with your local agent",
      "UAE requirements change periodically — verify all details directly with MOCCAE before travel",
    ],
  },

  // ── Germany ─────────────────────────────────────────────────────────────────
  DE: {
    tier: 1,
    countryName: "Germany",
    sourceUrl: "https://ec.europa.eu/food/animals/pet-movement",
    sourceUrlVerified: "page",
    lastVerified: "2026-03-22",
    microchip: {
      required: true,
      standard: "ISO 11784/11785",
      mustBeBeforeRabiesVaccine: true,
      notes: ["EU standard microchip required — must be implanted before rabies vaccination"],
    },
    rabiesVaccine: {
      rabiesRequired: true,
      otherRequired: [],
      notes: [
        "Rabies vaccination required and must be administered after microchipping",
        "Vaccination must be current (not expired) at time of entry",
      ],
    },
    titerTest: {
      required: false,
      waitDaysAfterTest: 0,
      approvedLabs: [],
      notes: [
        "Australia is an EU-listed third country — NO titer test required",
        "Significantly simpler than unlisted countries which require a 3-month post-titer wait",
      ],
    },
    tapeworm: {
      requiredForDogs: false,
      requiredForCats: false,
      activeIngredient: null,
      minHoursBeforeEntry: null,
      maxHoursBeforeEntry: null,
      notes: [],
    },
    healthCertificate: {
      required: true,
      validityDaysDog: 10,
      validityDaysCat: 10,
      issuingAuthority: "DAFF official veterinarian (must be endorsed by DAFF)",
      notes: [
        "EU health certificate (Form IV) required for entry from listed countries",
        "Must be issued by an official government veterinarian and endorsed by DAFF",
      ],
    },
    quarantine: {
      required: false,
      durationDays: 0,
      facilityName: null,
      notes: ["No quarantine required from Australia (EU listed third country)"],
    },
    importPermit: {
      required: false,
      cost: null,
      currency: null,
      notes: ["No import permit required for pet dogs and cats from Australia"],
    },
    bannedBreeds: [
      { breed: "Pit Bull Terrier", notes: "Banned or restricted in multiple German states" },
      { breed: "Staffordshire Bull Terrier", notes: "Restricted in some German states" },
      { breed: "American Staffordshire Terrier", notes: "Restricted in some German states" },
      { breed: "Bull Terrier", notes: "Restricted in some German states" },
    ],
    estimatedLeadTimeWeeks: 8,
    advanceNoticeHours: null,
    advanceNoticeRequired: false,
    officialContact: "ec.europa.eu/food/animals/pet-movement",
    notes: [
      "Rules are consistent across all EU member states via EU Regulation 576/2013",
      "Germany may have additional state-level (Bundesland) breed restrictions — check your specific destination state",
      "The EU Form IV health certificate must be prepared by an official vet and endorsed by DAFF",
    ],
  },

  // ── France ──────────────────────────────────────────────────────────────────
  FR: {
    tier: 1,
    countryName: "France",
    sourceUrl: "https://ec.europa.eu/food/animals/pet-movement",
    sourceUrlVerified: "page",
    lastVerified: "2026-03-22",
    microchip: {
      required: true,
      standard: "ISO 11784/11785",
      mustBeBeforeRabiesVaccine: true,
      notes: ["EU standard microchip required"],
    },
    rabiesVaccine: {
      rabiesRequired: true,
      otherRequired: [],
      notes: ["Must be administered after microchipping and must be current at entry"],
    },
    titerTest: {
      required: false,
      waitDaysAfterTest: 0,
      approvedLabs: [],
      notes: ["Australia is an EU-listed third country — no titer test required"],
    },
    tapeworm: {
      requiredForDogs: false,
      requiredForCats: false,
      activeIngredient: null,
      minHoursBeforeEntry: null,
      maxHoursBeforeEntry: null,
      notes: [],
    },
    healthCertificate: {
      required: true,
      validityDaysDog: 10,
      validityDaysCat: 10,
      issuingAuthority: "DAFF official veterinarian",
      notes: ["EU health certificate (Form IV) required — must be endorsed by DAFF"],
    },
    quarantine: {
      required: false,
      durationDays: 0,
      facilityName: null,
      notes: ["No quarantine required from Australia"],
    },
    importPermit: {
      required: false,
      cost: null,
      currency: null,
      notes: ["No import permit required"],
    },
    bannedBreeds: [
      { breed: "Pit Bull Terrier", notes: "Category 1 attack dog — banned in France" },
      { breed: "Boerboel", notes: "Category 1 attack dog — banned in France" },
      { breed: "Tosa Inu", notes: "Category 1 attack dog — banned in France" },
      { breed: "American Staffordshire Terrier", notes: "Category 2 — muzzle/lead required" },
      { breed: "Staffordshire Bull Terrier", notes: "Category 2 — muzzle/lead required in public" },
      { breed: "Rottweiler", notes: "Category 2 — muzzle/lead required in public" },
    ],
    estimatedLeadTimeWeeks: 8,
    advanceNoticeHours: null,
    advanceNoticeRequired: false,
    officialContact: "ec.europa.eu/food/animals/pet-movement",
    notes: [
      "Rules are consistent across all EU member states via EU Regulation 576/2013",
      "France has two categories of 'dangerous dogs' with specific public behaviour requirements",
      "The EU Form IV health certificate is required — prepared by an official vet and endorsed by DAFF",
    ],
  },

  // ── Ireland ─────────────────────────────────────────────────────────────────
  IE: {
    tier: 1,
    countryName: "Ireland",
    sourceUrl: "https://www.gov.ie/en/service/bring-your-pet-to-ireland/",
    sourceUrlVerified: "page",
    lastVerified: "2026-03-22",
    microchip: {
      required: true,
      standard: "ISO 11784/11785",
      mustBeBeforeRabiesVaccine: true,
      notes: ["Must be implanted before rabies vaccination"],
    },
    rabiesVaccine: {
      rabiesRequired: true,
      otherRequired: [],
      notes: ["Must be administered after microchipping and current at entry"],
    },
    titerTest: {
      required: false,
      waitDaysAfterTest: 0,
      approvedLabs: [],
      notes: [
        "Australia is an EU-listed third country — no titer test required for entry to Ireland",
      ],
    },
    tapeworm: {
      requiredForDogs: true,
      requiredForCats: false,
      activeIngredient: "praziquantel",
      minHoursBeforeEntry: 24,
      maxHoursBeforeEntry: 120,
      notes: [
        "Dogs ONLY — same requirement as UK as Ireland applies equivalent tapeworm rules",
        "Must contain praziquantel, administered 24 to 120 hours before Irish entry",
        "Must be administered by a vet and recorded in the health certificate",
      ],
    },
    healthCertificate: {
      required: true,
      validityDaysDog: 10,
      validityDaysCat: 10,
      issuingAuthority: "DAFF official veterinarian",
      notes: ["EU health certificate (Form IV) required — endorsed by DAFF"],
    },
    quarantine: {
      required: false,
      durationDays: 0,
      facilityName: null,
      notes: ["No quarantine required from Australia"],
    },
    importPermit: {
      required: false,
      cost: null,
      currency: null,
      notes: ["No import permit required"],
    },
    bannedBreeds: [
      { breed: "Pit Bull Terrier", notes: "Banned under Irish Control of Dogs Act" },
      { breed: "Staffordshire Bull Terrier", notes: "Restricted in Ireland — muzzle required" },
      { breed: "American Staffordshire Terrier", notes: "Restricted in Ireland" },
      { breed: "Bull Mastiff", notes: "Restricted in Ireland" },
      { breed: "Dobermann Pinscher", notes: "Restricted in Ireland" },
      { breed: "Rottweiler", notes: "Restricted in Ireland — muzzle required in public" },
    ],
    estimatedLeadTimeWeeks: 8,
    advanceNoticeHours: null,
    advanceNoticeRequired: false,
    officialContact: "www.gov.ie/en/service/bring-your-pet-to-ireland/",
    notes: [
      "Ireland applies tapeworm treatment rules equivalent to the UK — do not overlook this for dogs",
      "Australia is an EU-listed third country under EU Regulation 576/2013",
      "Despite EU rules, Ireland uses its own health certificate form — verify with your vet",
    ],
  },

  // ── Netherlands ─────────────────────────────────────────────────────────────
  NL: {
    tier: 1,
    countryName: "Netherlands",
    sourceUrl: "https://ec.europa.eu/food/animals/pet-movement",
    sourceUrlVerified: "page",
    lastVerified: "2026-03-22",
    microchip: {
      required: true,
      standard: "ISO 11784/11785",
      mustBeBeforeRabiesVaccine: true,
      notes: ["EU standard microchip required"],
    },
    rabiesVaccine: {
      rabiesRequired: true,
      otherRequired: [],
      notes: ["Must be administered after microchipping"],
    },
    titerTest: {
      required: false,
      waitDaysAfterTest: 0,
      approvedLabs: [],
      notes: ["Australia is an EU-listed third country — no titer test required"],
    },
    tapeworm: {
      requiredForDogs: false,
      requiredForCats: false,
      activeIngredient: null,
      minHoursBeforeEntry: null,
      maxHoursBeforeEntry: null,
      notes: [],
    },
    healthCertificate: {
      required: true,
      validityDaysDog: 10,
      validityDaysCat: 10,
      issuingAuthority: "DAFF official veterinarian",
      notes: ["EU health certificate (Form IV) required — endorsed by DAFF"],
    },
    quarantine: {
      required: false,
      durationDays: 0,
      facilityName: null,
      notes: ["No quarantine required from Australia"],
    },
    importPermit: {
      required: false,
      cost: null,
      currency: null,
      notes: ["No import permit required"],
    },
    bannedBreeds: [
      { breed: "Pit Bull Terrier", notes: "Breed-specific legislation applies in Netherlands" },
    ],
    estimatedLeadTimeWeeks: 8,
    advanceNoticeHours: null,
    advanceNoticeRequired: false,
    officialContact: "ec.europa.eu/food/animals/pet-movement",
    notes: [
      "Rules are consistent across all EU member states via EU Regulation 576/2013",
      "Netherlands removed national pit bull ban in 2008 but municipalities may still have restrictions",
    ],
  },

  // ── Switzerland ─────────────────────────────────────────────────────────────
  CH: {
    tier: 1,
    countryName: "Switzerland",
    sourceUrl: "https://www.blv.admin.ch/blv/en/home/tiere/reisen-mit-heimtieren.html",
    sourceUrlVerified: "page",
    lastVerified: "2026-03-22",
    microchip: {
      required: true,
      standard: "ISO 11784/11785",
      mustBeBeforeRabiesVaccine: true,
      notes: ["ISO microchip required — same standard as EU but applied under Swiss law"],
    },
    rabiesVaccine: {
      rabiesRequired: true,
      otherRequired: [],
      notes: [
        "Rabies vaccination required — must be administered after microchipping",
        "Switzerland is not in the EU but follows equivalent requirements under bilateral agreement",
      ],
    },
    titerTest: {
      required: false,
      waitDaysAfterTest: 0,
      approvedLabs: [],
      notes: [
        "Australia is a listed country under Swiss rules — no titer test required",
        "Switzerland maintains its own listed country classification independent of EU",
      ],
    },
    tapeworm: {
      requiredForDogs: false,
      requiredForCats: false,
      activeIngredient: null,
      minHoursBeforeEntry: null,
      maxHoursBeforeEntry: null,
      notes: [],
    },
    healthCertificate: {
      required: true,
      validityDaysDog: 10,
      validityDaysCat: 10,
      issuingAuthority: "DAFF official veterinarian",
      notes: [
        "Switzerland has its own health certificate format (not EU Form IV)",
        "Certificate must be endorsed by DAFF as an official government vet document",
      ],
    },
    quarantine: {
      required: false,
      durationDays: 0,
      facilityName: null,
      notes: ["No quarantine required from Australia under Swiss rules"],
    },
    importPermit: {
      required: false,
      cost: null,
      currency: null,
      notes: ["No import permit required for pet dogs and cats from Australia"],
    },
    bannedBreeds: [
      { breed: "Pit Bull Terrier", notes: "Banned or restricted in multiple Swiss cantons" },
    ],
    estimatedLeadTimeWeeks: 8,
    advanceNoticeHours: null,
    advanceNoticeRequired: false,
    officialContact: "www.blv.admin.ch",
    notes: [
      "Switzerland is NOT in the EU — do not assume EU rules apply directly",
      "Switzerland has a bilateral agreement with the EU on pet movement but maintains independent regulations",
      "Individual Swiss cantons (states) may have additional requirements — check your specific destination canton",
      "The FSVO (Federal Food Safety and Veterinary Office, BLV) is the authoritative source",
    ],
  },

  // ── Italy ───────────────────────────────────────────────────────────────────
  IT: {
    tier: 1,
    countryName: "Italy",
    sourceUrl: "https://ec.europa.eu/food/animals/pet-movement",
    sourceUrlVerified: "page",
    lastVerified: "2026-03-22",
    microchip: {
      required: true,
      standard: "ISO 11784/11785",
      mustBeBeforeRabiesVaccine: true,
      notes: ["EU standard microchip required"],
    },
    rabiesVaccine: {
      rabiesRequired: true,
      otherRequired: [],
      notes: ["Must be administered after microchipping and current at entry"],
    },
    titerTest: {
      required: false,
      waitDaysAfterTest: 0,
      approvedLabs: [],
      notes: ["Australia is an EU-listed third country — no titer test required"],
    },
    tapeworm: {
      requiredForDogs: false,
      requiredForCats: false,
      activeIngredient: null,
      minHoursBeforeEntry: null,
      maxHoursBeforeEntry: null,
      notes: [],
    },
    healthCertificate: {
      required: true,
      validityDaysDog: 10,
      validityDaysCat: 10,
      issuingAuthority: "DAFF official veterinarian",
      notes: ["EU health certificate (Form IV) required — endorsed by DAFF"],
    },
    quarantine: {
      required: false,
      durationDays: 0,
      facilityName: null,
      notes: ["No quarantine required from Australia"],
    },
    importPermit: {
      required: false,
      cost: null,
      currency: null,
      notes: ["No import permit required"],
    },
    bannedBreeds: [],
    estimatedLeadTimeWeeks: 8,
    advanceNoticeHours: null,
    advanceNoticeRequired: false,
    officialContact: "ec.europa.eu/food/animals/pet-movement",
    notes: [
      "Rules are consistent across all EU member states via EU Regulation 576/2013",
      "Italy does not currently have national breed-specific legislation but some municipalities may have local rules",
    ],
  },

  // ── Spain ───────────────────────────────────────────────────────────────────
  ES: {
    tier: 1,
    countryName: "Spain",
    sourceUrl: "https://ec.europa.eu/food/animals/pet-movement",
    sourceUrlVerified: "page",
    lastVerified: "2026-03-22",
    microchip: {
      required: true,
      standard: "ISO 11784/11785",
      mustBeBeforeRabiesVaccine: true,
      notes: ["EU standard microchip required"],
    },
    rabiesVaccine: {
      rabiesRequired: true,
      otherRequired: [],
      notes: ["Must be administered after microchipping and current at entry"],
    },
    titerTest: {
      required: false,
      waitDaysAfterTest: 0,
      approvedLabs: [],
      notes: ["Australia is an EU-listed third country — no titer test required"],
    },
    tapeworm: {
      requiredForDogs: false,
      requiredForCats: false,
      activeIngredient: null,
      minHoursBeforeEntry: null,
      maxHoursBeforeEntry: null,
      notes: [],
    },
    healthCertificate: {
      required: true,
      validityDaysDog: 10,
      validityDaysCat: 10,
      issuingAuthority: "DAFF official veterinarian",
      notes: ["EU health certificate (Form IV) required — endorsed by DAFF"],
    },
    quarantine: {
      required: false,
      durationDays: 0,
      facilityName: null,
      notes: ["No quarantine required from Australia"],
    },
    importPermit: {
      required: false,
      cost: null,
      currency: null,
      notes: ["No import permit required"],
    },
    bannedBreeds: [
      { breed: "Pit Bull Terrier", notes: "Potentially dangerous dog (PPP) classification in Spain" },
      { breed: "Staffordshire Bull Terrier", notes: "PPP classification — restrictions apply" },
      { breed: "American Staffordshire Terrier", notes: "PPP classification" },
      { breed: "Rottweiler", notes: "PPP classification — muzzle and lead required in public" },
      { breed: "Dogo Argentino", notes: "PPP classification" },
      { breed: "Fila Brasileiro", notes: "PPP classification" },
      { breed: "Japanese Tosa", notes: "PPP classification" },
    ],
    estimatedLeadTimeWeeks: 8,
    advanceNoticeHours: null,
    advanceNoticeRequired: false,
    officialContact: "ec.europa.eu/food/animals/pet-movement",
    notes: [
      "Rules are consistent across all EU member states via EU Regulation 576/2013",
      "Spain has a national list of 'Potentially Dangerous Pets' (PPP) with insurance and muzzle requirements",
      "Individual Spanish regions (Comunidades Autónomas) may have additional or stricter rules",
    ],
  },

  // ── Hong Kong ───────────────────────────────────────────────────────────────
  HK: {
    tier: 1,
    countryName: "Hong Kong",
    sourceUrl: "https://www.afcd.gov.hk/english/quarantine/qua_ie/qua_ie_qa/qua_ie_qa.html",
    sourceUrlVerified: "page",
    lastVerified: "2026-03-22",
    microchip: {
      required: true,
      standard: "ISO 11784/11785",
      mustBeBeforeRabiesVaccine: true,
      notes: [
        "ISO microchip required — Hong Kong rules are independent of mainland China",
        "Must be implanted before vaccinations",
      ],
    },
    rabiesVaccine: {
      rabiesRequired: true,
      otherRequired: [],
      notes: [
        "Valid rabies vaccination required — must be administered after microchipping",
        "Vaccination must be current (not expired) at time of import",
      ],
    },
    titerTest: {
      required: false,
      waitDaysAfterTest: 0,
      approvedLabs: [],
      notes: [
        "No titer test required from Australia",
        "Australia is classified favourably for HK import",
      ],
    },
    tapeworm: {
      requiredForDogs: false,
      requiredForCats: false,
      activeIngredient: null,
      minHoursBeforeEntry: null,
      maxHoursBeforeEntry: null,
      notes: [],
    },
    healthCertificate: {
      required: true,
      validityDaysDog: 14,
      validityDaysCat: 14,
      issuingAuthority: "DAFF-accredited official veterinarian",
      notes: [
        "Health certificate must be issued within 14 days of departure from Australia",
        "Must be endorsed by DAFF as an official government vet document",
        "Must be in English",
      ],
    },
    quarantine: {
      required: true,
      durationDays: 4,
      facilityName: "AFCD Quarantine Facility",
      notes: [
        "Minimum 4-day quarantine on arrival at AFCD facility",
        "Must apply for an import licence before travel",
        "Quarantine facility must be pre-booked",
      ],
    },
    importPermit: {
      required: true,
      cost: null,
      currency: null,
      notes: [
        "Import licence required from AFCD (Agriculture, Fisheries and Conservation Department)",
        "Apply via AFCD before travel — allow sufficient processing time",
        "This is an AFCD licence — not from mainland China customs",
      ],
    },
    bannedBreeds: [
      { breed: "Pit Bull Terrier", notes: "Prohibited in Hong Kong under cap. 167 Public Health (Animals and Birds) Ordinance" },
    ],
    estimatedLeadTimeWeeks: 10,
    advanceNoticeHours: null,
    advanceNoticeRequired: false,
    officialContact: "www.afcd.gov.hk",
    notes: [
      "Hong Kong rules are governed by AFCD and are completely independent of mainland China",
      "Do not confuse mainland China's pet import rules with Hong Kong's — they are entirely different",
      "The import licence application must be submitted well in advance of travel",
    ],
  },
};

// ── Helper functions ──────────────────────────────────────────────────────────

/**
 * Returns the tier (1, 2, or 3) for the given ISO country code.
 * Returns 2 for unknown/unrecognised country codes.
 */
export function getTierForCountry(countryCode: string): 1 | 2 | 3 {
  if (!countryCode) return 2;
  const rules = DESTINATION_RULES[countryCode.toUpperCase()];
  if (!rules) return 2;
  return rules.tier;
}

/**
 * Returns the full outbound rules as a JSON string for injection into Claude prompts.
 */
export function getOutboundRulesAsContext(): string {
  return JSON.stringify(
    { australiaExportProcess: AUSTRALIA_EXPORT_PROCESS, destinationRules: DESTINATION_RULES },
    null,
    2
  );
}

/**
 * Case-insensitive check whether a breed is banned at a destination.
 * Checks destination-specific banned breeds list.
 */
export function isOutboundBreedBanned(breed: string, destinationCode: string): boolean {
  if (!breed) return false;
  const rules = DESTINATION_RULES[destinationCode.toUpperCase()];
  if (!rules) return false;
  const lower = breed.toLowerCase();
  return rules.bannedBreeds.some(
    (b) =>
      b.breed.toLowerCase().includes(lower) || lower.includes(b.breed.toLowerCase())
  );
}

// ── Date calculation helpers ──────────────────────────────────────────────────

/**
 * Subtracts n calendar days from a date, returning a new Date at midnight UTC.
 */
function subtractDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Subtracts n business days from a date (skips Saturday and Sunday).
 */
function subtractBusinessDays(from: Date, businessDays: number): Date {
  let d = new Date(from);
  let remaining = businessDays;
  while (remaining > 0) {
    d.setUTCDate(d.getUTCDate() - 1);
    const dow = d.getUTCDay(); // 0 = Sun, 6 = Sat
    if (dow !== 0 && dow !== 6) {
      remaining--;
    }
  }
  return d;
}

/**
 * Calculates the latest date the DAFF export permit can be obtained such that
 * the 72-hour window covers the departure date.
 * Also accounts for the fact that DAFF appointments happen on business days.
 */
function calculatePermitDate(departureDate: Date, permitWindowHours: number): Date {
  // The permit must be issued within permitWindowHours of departure.
  // Calculate the latest issue date = departure - permitWindowHours + small buffer.
  // We subtract permitWindowHours in hours, then set to start-of-day and subtract 1
  // more day as a buffer to ensure the permit is actually within the window.
  const windowDays = Math.floor(permitWindowHours / 24);
  let d = subtractDays(departureDate, windowDays);
  // Ensure it's a business day (Mon–Fri) — if it falls on a weekend, move to Friday
  const dow = d.getUTCDay();
  if (dow === 0) d = subtractDays(d, 2); // Sunday → Friday
  if (dow === 6) d = subtractDays(d, 1); // Saturday → Friday
  return d;
}

// ── getOutboundTimeline ───────────────────────────────────────────────────────

/**
 * Generates a combined outbound timeline for a pet travelling from Australia
 * to the specified destination. Returns AU export steps + destination import
 * steps, each with a calculatedDate working backwards from departureDate.
 */
export function getOutboundTimeline(input: GetOutboundTimelineInput): OutboundTimeline {
  const { destinationCode, petType, departureDate, isAlreadyMicrochipped } = input;
  const code = destinationCode.toUpperCase();
  const destRules = DESTINATION_RULES[code];
  const tier = destRules?.tier ?? 2;
  const destName = destRules?.countryName ?? destinationCode;
  const lastVerified = destRules?.lastVerified ?? AUSTRALIA_EXPORT_PROCESS.lastVerified;

  const steps: OutboundStep[] = [];

  // ── Section 1: Australian export steps ──────────────────────────────────────

  for (const auStep of AUSTRALIA_EXPORT_PROCESS.steps) {
    let calculatedDate: Date;
    let alreadyComplete = false;
    let title = auStep.title;
    let description = auStep.description;

    if (auStep.id === "daff-export-permit") {
      calculatedDate = calculatePermitDate(departureDate, auStep.permitWindowHours ?? 72);
    } else if (auStep.id === "daff-noi") {
      calculatedDate = subtractBusinessDays(
        departureDate,
        auStep.minBusinessDaysBeforeDeparture ?? 10
      );
    } else if (auStep.id === "au-vet-health-cert") {
      // Vet inspection should be just before the DAFF permit appointment
      const permitDate = calculatePermitDate(departureDate, 72);
      calculatedDate = subtractDays(permitDate, 1);
    } else if (auStep.id === "au-microchip") {
      // Must be done well in advance — show as 8 weeks before departure minimum
      calculatedDate = subtractDays(departureDate, 56);
      if (isAlreadyMicrochipped) {
        alreadyComplete = true;
        title = "Verify microchip compliance";
        description =
          "Your pet is already microchipped. Verify the chip is ISO 11784/11785 compliant and was implanted BEFORE any rabies vaccination or blood sampling. Ask your vet to scan the chip and confirm the standard. This step is marked complete but the verification is still required.";
      }
    } else if (auStep.id === "au-rabies-vaccine") {
      // Rabies vaccine timing depends on destination — use 6 weeks before departure as default
      calculatedDate = subtractDays(departureDate, 42);
    } else {
      calculatedDate = subtractDays(departureDate, 14);
    }

    steps.push({
      id: auStep.id,
      section: "au-export",
      title,
      description,
      calculatedDate,
      sourceUrl: auStep.sourceUrl,
      isVerified: true,
      estimatedCostAUD: auStep.estimatedCostAUD,
      alreadyComplete,
    });
  }

  // ── Section 2: Destination import steps (Tier 1 only) ───────────────────────

  if (destRules) {
    // isVerified = true only when we have confirmed the exact page URL, not just the authority homepage
    const isVerified = tier === 1 && destRules.sourceUrlVerified === "page";

    // Titer test — must be done early (180-day wait for Japan)
    if (destRules.titerTest.required) {
      const waitDays = destRules.titerTest.waitDaysAfterTest;
      const titerDate = subtractDays(departureDate, waitDays + 14); // 14 days buffer on top of wait
      steps.push({
        id: "destination-titer-test",
        section: "destination",
        title: `Rabies antibody titer test (required for ${destName})`,
        description: `A rabies neutralising antibody titer test (FAVN or RFFIT) is required for entry to ${destName}. ${
          waitDays > 0
            ? `There is a ${waitDays}-day mandatory waiting period after the blood sample is taken before your pet can travel.`
            : ""
        } ${destRules.titerTest.notes.join(" ")}`,
        calculatedDate: titerDate,
        sourceUrl: destRules.sourceUrl,
        isVerified,
        estimatedCostAUD: null,
        alreadyComplete: false,
      });
    }

    // Destination-specific health certificate
    const healthCertValidityDays =
      petType === "dog"
        ? destRules.healthCertificate.validityDaysDog
        : destRules.healthCertificate.validityDaysCat;
    // Calculate the latest date for vet inspection (validity is from inspection to arrival)
    const healthCertDate = subtractDays(departureDate, healthCertValidityDays);
    steps.push({
      id: "destination-health-cert",
      section: "destination",
      title: `Obtain health certificate for ${destName}`,
      description: `An official veterinary health certificate is required for entry to ${destName}. For ${petType === "dog" ? "dogs" : "cats"}, the vet inspection must be within ${healthCertValidityDays} days of arrival in ${destName}. ${destRules.healthCertificate.notes.join(" ")}`,
      calculatedDate: healthCertDate,
      sourceUrl: destRules.sourceUrl,
      isVerified,
      estimatedCostAUD: null,
      alreadyComplete: false,
    });

    // Tapeworm treatment (dogs to UK/Ireland)
    if (
      (petType === "dog" && destRules.tapeworm.requiredForDogs) ||
      (petType === "cat" && destRules.tapeworm.requiredForCats)
    ) {
      const tapewormMinHours = destRules.tapeworm.minHoursBeforeEntry ?? 24;
      const tapewormMaxHours = destRules.tapeworm.maxHoursBeforeEntry ?? 120;
      // Calculate the treatment window — must be within the hours before entry (not departure, but arrival)
      // Arrival ≈ departure + ~1 day travel. We use departure as a proxy.
      const tapewormLatest = subtractDays(departureDate, Math.floor(tapewormMinHours / 24));
      const tapewormEarliest = subtractDays(departureDate, Math.floor(tapewormMaxHours / 24));
      steps.push({
        id: "destination-tapeworm",
        section: "destination",
        title: `Tapeworm treatment (required for ${petType === "dog" ? "dogs" : "cats"} entering ${destName})`,
        description: `Your dog must receive a tapeworm treatment containing ${destRules.tapeworm.activeIngredient ?? "praziquantel"} between ${Math.floor(tapewormMaxHours / 24)} days and ${Math.floor(tapewormMinHours / 24)} days before arriving in ${destName}. The treatment must be administered by a vet. Treatment window: ${tapewormEarliest.toDateString()} to ${tapewormLatest.toDateString()}. ${destRules.tapeworm.notes.join(" ")}`,
        calculatedDate: tapewormEarliest,
        sourceUrl: destRules.sourceUrl,
        isVerified,
        estimatedCostAUD: null,
        alreadyComplete: false,
      });
    }

    // Quarantine notification / booking
    if (destRules.quarantine.required) {
      steps.push({
        id: "destination-quarantine",
        section: "destination",
        title: `Book quarantine in ${destName} (${destRules.quarantine.durationDays} days)`,
        description: `${destName} requires ${destRules.quarantine.durationDays} days of quarantine on arrival${destRules.quarantine.facilityName ? ` at ${destRules.quarantine.facilityName}` : ""}. Book your quarantine place well in advance — spaces are limited. ${destRules.quarantine.notes.join(" ")}`,
        calculatedDate: subtractDays(departureDate, 56), // Book 8 weeks ahead
        sourceUrl: destRules.sourceUrl,
        isVerified,
        estimatedCostAUD: null,
        alreadyComplete: false,
      });
    }

    // Import permit
    if (destRules.importPermit.required) {
      steps.push({
        id: "destination-import-permit",
        section: "destination",
        title: `Obtain import permit for ${destName}`,
        description: `An import permit is required for your pet to enter ${destName}. Apply well in advance of travel. ${destRules.importPermit.notes.join(" ")}`,
        calculatedDate: subtractDays(departureDate, 42),
        sourceUrl: destRules.sourceUrl,
        isVerified,
        estimatedCostAUD: destRules.importPermit.cost,
        alreadyComplete: false,
      });
    }

    // Advance notice
    if (destRules.advanceNoticeRequired && destRules.advanceNoticeHours) {
      const noticeDays = Math.ceil(destRules.advanceNoticeHours / 24);
      steps.push({
        id: "destination-advance-notice",
        section: "destination",
        title: `Notify ${destName} authority before arrival`,
        description: `You must notify the relevant ${destName} authority at least ${destRules.advanceNoticeHours} hours (${noticeDays} days) before your pet arrives. Contact: ${destRules.officialContact}. ${destRules.notes.slice(0, 1).join(" ")}`,
        calculatedDate: subtractDays(departureDate, noticeDays),
        sourceUrl: destRules.sourceUrl,
        isVerified,
        estimatedCostAUD: null,
        alreadyComplete: false,
      });
    }
  } else {
    // Tier 2/3 — return AU export steps only with a placeholder destination step
    steps.push({
      id: "destination-placeholder",
      section: "destination",
      title: `Contact ${destName} official authority for import requirements`,
      description: `PetBorder has not yet verified the specific import requirements for ${destName}. The Australian export steps above apply to all outbound journeys. For ${destName} import requirements, contact the official government veterinary authority directly.`,
      calculatedDate: subtractDays(departureDate, 90),
      sourceUrl: "https://www.agriculture.gov.au",
      isVerified: false,
      estimatedCostAUD: null,
      alreadyComplete: false,
    });
  }

  // Sort all steps by calculatedDate ascending (earliest deadline first)
  steps.sort((a, b) => a.calculatedDate.getTime() - b.calculatedDate.getTime());

  const hasLongLeadTimeWarning =
    destRules?.estimatedLeadTimeWeeks !== undefined &&
    destRules.estimatedLeadTimeWeeks >= 24;

  return {
    destinationCode: code,
    destinationName: destName,
    petType,
    departureDate,
    tier,
    hasLongLeadTimeWarning,
    steps,
    lastVerified,
    disclaimer:
      "This timeline is based on outbound rules last verified on the date shown. Requirements can change. Always confirm with DAFF at agriculture.gov.au and the destination country's official authority before booking travel for your pet. PetBorder is a planning tool, not legal or veterinary advice.",
  };
}

// ── Zod schema ────────────────────────────────────────────────────────────────

const MicrochipSchema = z.object({
  required: z.boolean(),
  standard: z.string(),
  mustBeBeforeRabiesVaccine: z.boolean(),
  notes: z.array(z.string()),
});

const VaccineSchema = z.object({
  rabiesRequired: z.boolean(),
  otherRequired: z.array(z.string()),
  notes: z.array(z.string()),
});

const TiterTestSchema = z.object({
  required: z.boolean(),
  waitDaysAfterTest: z.number(),
  approvedLabs: z.array(z.string()),
  notes: z.array(z.string()),
});

const TapewormSchema = z.object({
  requiredForDogs: z.boolean(),
  requiredForCats: z.boolean(),
  activeIngredient: z.string().nullable(),
  minHoursBeforeEntry: z.number().nullable(),
  maxHoursBeforeEntry: z.number().nullable(),
  notes: z.array(z.string()),
});

const QuarantineSchema = z.object({
  required: z.boolean(),
  durationDays: z.number(),
  facilityName: z.string().nullable(),
  notes: z.array(z.string()),
});

const HealthCertSchema = z.object({
  required: z.boolean(),
  validityDaysDog: z.number().min(1),
  validityDaysCat: z.number().min(1),
  issuingAuthority: z.string(),
  notes: z.array(z.string()),
});

const ImportPermitSchema = z.object({
  required: z.boolean(),
  cost: z.number().nullable(),
  currency: z.union([z.literal("AUD"), z.null()]),
  notes: z.array(z.string()),
});

const BannedBreedEntrySchema = z.object({
  breed: z.string().min(1),
  notes: z.string(),
});

const DestinationRulesEntrySchema = z.object({
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  countryName: z.string().min(1),
  sourceUrl: z.string().url(),
  sourceUrlVerified: z.union([z.literal("page"), z.literal("authority")]),
  lastVerified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  microchip: MicrochipSchema,
  rabiesVaccine: VaccineSchema,
  titerTest: TiterTestSchema,
  tapeworm: TapewormSchema,
  healthCertificate: HealthCertSchema,
  quarantine: QuarantineSchema,
  importPermit: ImportPermitSchema,
  bannedBreeds: z.array(BannedBreedEntrySchema),
  estimatedLeadTimeWeeks: z.number().min(1),
  advanceNoticeHours: z.number().nullable(),
  advanceNoticeRequired: z.boolean(),
  officialContact: z.string().min(1),
  notes: z.array(z.string()),
});

export const OutboundRulesSchema = z.record(z.string(), DestinationRulesEntrySchema);
