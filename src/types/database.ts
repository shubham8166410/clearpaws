import type { TimelineStep, TimelineWarning, DaffGroup, PetType } from "./timeline";
import type { UserRole, SubscriptionStatus } from "./subscription";

// ── Row types (what comes back from SELECT) ───────────────────────────────────

export interface ProfileRow {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface TimelineRow {
  id: string;
  user_id: string;
  pet_id: string | null;
  direction: "inbound" | "outbound"; // Phase 5 — defaults to 'inbound' for existing rows
  origin_country: string | null;     // null for outbound rows
  destination_country: string | null; // null for inbound rows
  travel_date: string; // YYYY-MM-DD
  pet_type: PetType;
  pet_breed: string;
  daff_group: DaffGroup | null; // null for outbound rows
  generated_steps: SavedTimelineSteps | SavedOutboundSteps;
  created_at: string;
}

export interface TimelineProgressRow {
  id: string;
  timeline_id: string;
  user_id: string;
  step_index: number;
  completed_at: string;
}

export interface PurchaseRow {
  id: string;
  user_id: string;
  timeline_id: string | null;
  stripe_session_id: string;
  amount_cents: number;
  paid_at: string;
  created_at: string;
}

// ── Phase 3 row types ─────────────────────────────────────────────────────────

export interface SubscriptionRow {
  id: string;
  user_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: SubscriptionStatus;
  current_period_end: string | null;
  created_at: string;
}

export interface PetRow {
  id: string;
  user_id: string;
  name: string;
  type: PetType;
  breed: string;
  microchip_number: string | null;
  date_of_birth: string | null; // YYYY-MM-DD
  created_at: string;
}

export interface VetClinicRow {
  id: string;
  name: string;
  address: string | null;
  state: string | null;
  postcode: string | null;
  phone: string | null;
  email: string | null;
  daff_approved: boolean;
  specialises_in_export: boolean;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface ApprovedLabRow {
  id: string;
  name: string;
  country: string;
  accepts_from_countries: string[]; // jsonb stored as string[]
  website: string | null;
  turnaround_days: number | null;
  notes: string | null;
  created_at: string;
}

export interface AgencyRow {
  id: string;
  name: string;
  url: string | null;
  tagline: string | null;
  description: string | null;
  services: string[];
  price_range: string | null;
  states_served: string[];
  rating: number | null;
  contact_email: string | null;
  created_at: string;
  // Phase 4 B2B white-label columns (nullable — existing rows unaffected)
  slug: string | null;
  logo_url: string | null;
  primary_colour: string | null;
  secondary_colour: string | null;
  owner_user_id: string | null;
  stripe_subscription_id: string | null;
}

// ── Phase 4 row types ─────────────────────────────────────────────────────────

export type AgencyLeadStatus = "new" | "contacted" | "converted" | "lost";

export interface AgencyLeadRow {
  id: string;
  agency_id: string;
  timeline_id: string | null;
  pet_owner_email: string;
  pet_owner_name: string | null;
  status: AgencyLeadStatus;
  notes: string | null;
  created_at: string;
}

export interface VetProfileRow {
  id: string;
  user_id: string;
  clinic_id: string | null;
  ahpra_number: string | null;
  daff_approved: boolean;
  verified_at: string | null;
  created_at: string;
}

export interface VetClientLinkRow {
  id: string;
  vet_profile_id: string;
  timeline_id: string;
  linked_at: string;
}

export interface ApiKeyRow {
  id: string;
  user_id: string;
  agency_id: string | null;
  key_prefix: string;
  key_hash: string;
  name: string;
  last_used_at: string | null;
  request_count: number;
  is_active: boolean;
  created_at: string;
}

export interface ApiUsageRow {
  id: string;
  api_key_id: string;
  endpoint: string;
  status_code: number | null;
  response_time_ms: number | null;
  created_at: string;
}

export interface ReferralClickRow {
  id: string;
  agency_name: string;
  timeline_id: string | null;
  user_id: string | null;
  clicked_at: string;
  source_page: string | null;
}

// ── Insert types (what you pass to INSERT) ────────────────────────────────────

export interface TimelineInsert {
  user_id: string;
  pet_id?: string | null;
  direction?: "inbound" | "outbound";
  origin_country?: string | null;
  destination_country?: string | null;
  travel_date: string;
  pet_type: PetType;
  pet_breed: string;
  daff_group?: DaffGroup | null;
  generated_steps: SavedTimelineSteps | SavedOutboundSteps;
}

export interface TimelineProgressInsert {
  timeline_id: string;
  user_id: string;
  step_index: number;
}

export interface PurchaseInsert {
  user_id: string;
  timeline_id: string | null;
  stripe_session_id: string;
  amount_cents: number;
}

export interface SubscriptionInsert {
  user_id: string;
  stripe_subscription_id?: string | null;
  stripe_customer_id?: string | null;
  status: SubscriptionStatus;
  current_period_end?: string | null;
}

export interface PetInsert {
  user_id: string;
  name: string;
  type: PetType;
  breed: string;
  microchip_number?: string | null;
  date_of_birth?: string | null;
}

export interface VetClinicInsert {
  name: string;
  address?: string | null;
  state?: string | null;
  postcode?: string | null;
  phone?: string | null;
  email?: string | null;
  daff_approved?: boolean;
  specialises_in_export?: boolean;
  lat?: number | null;
  lng?: number | null;
}

export interface ApprovedLabInsert {
  name: string;
  country: string;
  accepts_from_countries?: string[];
  website?: string | null;
  turnaround_days?: number | null;
  notes?: string | null;
}

export interface AgencyInsert {
  name: string;
  url?: string | null;
  tagline?: string | null;
  description?: string | null;
  services?: string[];
  price_range?: string | null;
  states_served?: string[];
  rating?: number | null;
  contact_email?: string | null;
  slug?: string | null;
  logo_url?: string | null;
  primary_colour?: string | null;
  secondary_colour?: string | null;
  owner_user_id?: string | null;
  stripe_subscription_id?: string | null;
}

export interface AgencyLeadInsert {
  agency_id: string;
  timeline_id?: string | null;
  pet_owner_email: string;
  pet_owner_name?: string | null;
  status?: AgencyLeadStatus;
  notes?: string | null;
}

export interface VetProfileInsert {
  user_id: string;
  clinic_id?: string | null;
  ahpra_number?: string | null;
  daff_approved?: boolean;
  verified_at?: string | null;
}

export interface VetClientLinkInsert {
  vet_profile_id: string;
  timeline_id: string;
}

export interface ApiKeyInsert {
  user_id: string;
  agency_id?: string | null;
  key_prefix: string;
  key_hash: string;
  name: string;
}

export interface ApiUsageInsert {
  api_key_id: string;
  endpoint: string;
  status_code?: number | null;
  response_time_ms?: number | null;
}

export interface ReferralClickInsert {
  agency_name: string;
  timeline_id?: string | null;
  user_id?: string | null;
  source_page?: string | null;
}

// ── Composite / denormalised types used in UI ─────────────────────────────────

/** The full timeline output shape stored in generated_steps jsonb column (inbound) */
export interface SavedTimelineSteps {
  steps: TimelineStep[];
  warnings: TimelineWarning[];
  totalEstimatedCostAUD: number;
  quarantineDays: number;
  earliestTravelDate: string;
  summary: string;
}

/** Outbound timeline data stored in generated_steps for outbound rows (Phase 5) */
export interface SavedOutboundSteps {
  direction: "outbound";
  destinationCode: string;
  destinationName: string;
  tier: 1 | 2 | 3;
  hasLongLeadTimeWarning: boolean;
  steps: Array<{
    id: string;
    section: "au-export" | "destination";
    title: string;
    description: string;
    calculatedDate: string; // YYYY-MM-DD
    sourceUrl: string;
    isVerified: boolean;
    estimatedCostAUD: number | null;
    alreadyComplete: boolean;
  }>;
  lastVerified: string;
  disclaimer: string;
}

/** Timeline row joined with progress for dashboard display */
export interface TimelineWithProgress extends TimelineRow {
  completedStepIndices: number[];
  hasPurchase: boolean;
}

// ── Supabase Database type map (for typed client) ─────────────────────────────
// Must include Views, Functions, Enums, CompositeTypes and Relationships to
// satisfy @supabase/supabase-js generic constraints.

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, "created_at">;
        Update: Partial<Omit<ProfileRow, "id" | "created_at">>;
        Relationships: [];
      };
      timelines: {
        Row: TimelineRow;
        Insert: TimelineInsert;
        Update: Partial<Omit<TimelineRow, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      timeline_progress: {
        Row: TimelineProgressRow;
        Insert: TimelineProgressInsert;
        Update: Record<string, never>;
        Relationships: [];
      };
      purchases: {
        Row: PurchaseRow;
        Insert: PurchaseInsert;
        Update: Record<string, never>;
        Relationships: [];
      };
      subscriptions: {
        Row: SubscriptionRow;
        Insert: SubscriptionInsert;
        Update: Partial<Omit<SubscriptionRow, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      pets: {
        Row: PetRow;
        Insert: PetInsert;
        Update: Partial<Omit<PetRow, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      vet_clinics: {
        Row: VetClinicRow;
        Insert: VetClinicInsert;
        Update: Partial<Omit<VetClinicRow, "id" | "created_at">>;
        Relationships: [];
      };
      approved_labs: {
        Row: ApprovedLabRow;
        Insert: ApprovedLabInsert;
        Update: Partial<Omit<ApprovedLabRow, "id" | "created_at">>;
        Relationships: [];
      };
      agencies: {
        Row: AgencyRow;
        Insert: AgencyInsert;
        Update: Partial<Omit<AgencyRow, "id" | "created_at">>;
        Relationships: [];
      };
      agency_leads: {
        Row: AgencyLeadRow;
        Insert: AgencyLeadInsert;
        Update: Partial<Pick<AgencyLeadRow, "status" | "notes">>;
        Relationships: [];
      };
      vet_profiles: {
        Row: VetProfileRow;
        Insert: VetProfileInsert;
        Update: Partial<Omit<VetProfileRow, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      vet_client_links: {
        Row: VetClientLinkRow;
        Insert: VetClientLinkInsert;
        Update: Record<string, never>;
        Relationships: [];
      };
      api_keys: {
        Row: ApiKeyRow;
        Insert: ApiKeyInsert;
        Update: Partial<Pick<ApiKeyRow, "is_active" | "last_used_at" | "request_count">>;
        Relationships: [];
      };
      api_usage: {
        Row: ApiUsageRow;
        Insert: ApiUsageInsert;
        Update: Record<string, never>;
        Relationships: [];
      };
      referral_clicks: {
        Row: ReferralClickRow;
        Insert: ReferralClickInsert;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_agency_owner: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_verified_vet: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
