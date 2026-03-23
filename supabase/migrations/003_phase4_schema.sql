-- ─────────────────────────────────────────────────────────────────────────────
-- PetBorder Phase 4 — Schema extensions
-- Run once in Supabase SQL editor: supabase.com → SQL Editor → paste → Run
-- Safe to run on top of 002_phase3_schema.sql
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Extend agencies with B2B white-label columns ──────────────────────────
-- All new columns are nullable so existing Phase 3 comparison rows are
-- unaffected. slug IS NOT NULL distinguishes B2B partner agencies.

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS slug              text UNIQUE
                                              CHECK (slug ~ '^[a-z0-9-]+$'),
  ADD COLUMN IF NOT EXISTS logo_url          text
                                              CHECK (char_length(logo_url) <= 500),
  ADD COLUMN IF NOT EXISTS primary_colour    text DEFAULT '#1B4F72'
                                              CHECK (primary_colour ~ '^#[0-9a-fA-F]{6}$'),
  ADD COLUMN IF NOT EXISTS secondary_colour  text
                                              CHECK (secondary_colour ~ '^#[0-9a-fA-F]{6}$'),
  ADD COLUMN IF NOT EXISTS owner_user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text UNIQUE;

CREATE INDEX IF NOT EXISTS agencies_slug_idx
  ON public.agencies(slug) WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS agencies_owner_user_id_idx
  ON public.agencies(owner_user_id) WHERE owner_user_id IS NOT NULL;

-- Agency owners can update their own agency branding
CREATE POLICY "Agency owners can update own agency"
  ON public.agencies FOR UPDATE
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Admins can update any agency (for onboarding / admin management)
CREATE POLICY "Admins can update any agency"
  ON public.agencies FOR UPDATE
  USING (public.is_admin());

-- Admins can insert agencies (B2B onboarding done by admin)
CREATE POLICY "Admins can insert agencies"
  ON public.agencies FOR INSERT
  WITH CHECK (public.is_admin());


-- ── 2. agency_leads ───────────────────────────────────────────────────────────
-- Leads captured through white-label portals, tagged to the agency.

CREATE TABLE IF NOT EXISTS public.agency_leads (
  id                uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id         uuid    NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  timeline_id       uuid    REFERENCES public.timelines(id) ON DELETE SET NULL,
  pet_owner_email   text    NOT NULL CHECK (pet_owner_email ~* '^[^@]+@[^@]+\.[^@]+$'),
  pet_owner_name    text    CHECK (char_length(pet_owner_name) <= 100),
  status            text    NOT NULL DEFAULT 'new'
                              CHECK (status IN ('new', 'contacted', 'converted', 'lost')),
  notes             text    CHECK (char_length(notes) <= 2000),
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_leads ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS agency_leads_agency_id_idx
  ON public.agency_leads(agency_id);
CREATE INDEX IF NOT EXISTS agency_leads_status_idx
  ON public.agency_leads(status);
CREATE INDEX IF NOT EXISTS agency_leads_created_at_idx
  ON public.agency_leads(created_at DESC);

-- Agency owners read/update only their own leads
CREATE POLICY "Agency owners can read own leads"
  ON public.agency_leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agencies
      WHERE id = agency_leads.agency_id
        AND owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Agency owners can update own leads"
  ON public.agency_leads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.agencies
      WHERE id = agency_leads.agency_id
        AND owner_user_id = auth.uid()
    )
  );

-- Inserts are server-side only via service role (no client INSERT policy)
CREATE POLICY "Admins can read all leads"
  ON public.agency_leads FOR SELECT
  USING (public.is_admin());


-- ── 3. vet_profiles ───────────────────────────────────────────────────────────
-- Links an authenticated user to a vet_clinics entry.
-- verified_at NULL = pending verification; non-NULL = approved.

CREATE TABLE IF NOT EXISTS public.vet_profiles (
  id             uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        uuid    NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id      uuid    REFERENCES public.vet_clinics(id) ON DELETE SET NULL,
  ahpra_number   text    CHECK (char_length(ahpra_number) <= 20),
  daff_approved  boolean NOT NULL DEFAULT false,
  verified_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vet_profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS vet_profiles_user_id_idx
  ON public.vet_profiles(user_id);
CREATE INDEX IF NOT EXISTS vet_profiles_clinic_id_idx
  ON public.vet_profiles(clinic_id) WHERE clinic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS vet_profiles_verified_at_idx
  ON public.vet_profiles(verified_at) WHERE verified_at IS NOT NULL;

-- Vets can read and insert their own profile
CREATE POLICY "Vets can read own profile"
  ON public.vet_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Vets can insert own profile"
  ON public.vet_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins read and update all (for verification workflow)
CREATE POLICY "Admins can read all vet profiles"
  ON public.vet_profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update any vet profile"
  ON public.vet_profiles FOR UPDATE
  USING (public.is_admin());


-- ── 4. vet_client_links ───────────────────────────────────────────────────────
-- Explicit junction table linking a verified vet to a client timeline.
-- Required to prevent implicit cross-client access via clinic match.

CREATE TABLE IF NOT EXISTS public.vet_client_links (
  id              uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
  vet_profile_id  uuid    NOT NULL REFERENCES public.vet_profiles(id) ON DELETE CASCADE,
  timeline_id     uuid    NOT NULL REFERENCES public.timelines(id) ON DELETE CASCADE,
  linked_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vet_profile_id, timeline_id)
);

ALTER TABLE public.vet_client_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS vet_client_links_vet_profile_id_idx
  ON public.vet_client_links(vet_profile_id);
CREATE INDEX IF NOT EXISTS vet_client_links_timeline_id_idx
  ON public.vet_client_links(timeline_id);

-- Vets can read links for their own profile
CREATE POLICY "Vets can read own client links"
  ON public.vet_client_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.vet_profiles
      WHERE id = vet_client_links.vet_profile_id
        AND user_id = auth.uid()
    )
  );

-- Clients can read their own timeline links (to see which vet is assigned)
CREATE POLICY "Clients can read own timeline links"
  ON public.vet_client_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.timelines
      WHERE id = vet_client_links.timeline_id
        AND user_id = auth.uid()
    )
  );

-- Inserts are server-side only via service role
CREATE POLICY "Admins can read all vet client links"
  ON public.vet_client_links FOR SELECT
  USING (public.is_admin());


-- ── 5. api_keys ───────────────────────────────────────────────────────────────
-- API key auth for the public REST API.
-- Only key_prefix is stored in plain text for fast indexed lookup.
-- key_hash is a bcrypt hash of the full raw key.

CREATE TABLE IF NOT EXISTS public.api_keys (
  id              uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id       uuid    REFERENCES public.agencies(id) ON DELETE SET NULL,
  key_prefix      text    NOT NULL CHECK (char_length(key_prefix) = 8),
  key_hash        text    NOT NULL,
  name            text    NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  last_used_at    timestamptz,
  request_count   integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Fast prefix lookup (the critical path on every API request)
CREATE INDEX IF NOT EXISTS api_keys_key_prefix_idx
  ON public.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS api_keys_user_id_idx
  ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS api_keys_agency_id_idx
  ON public.api_keys(agency_id) WHERE agency_id IS NOT NULL;

-- Users read/delete their own keys
CREATE POLICY "Users can read own API keys"
  ON public.api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
  ON public.api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- Inserts and updates are server-side only via service role
CREATE POLICY "Admins can read all API keys"
  ON public.api_keys FOR SELECT
  USING (public.is_admin());


-- ── 6. api_usage ─────────────────────────────────────────────────────────────
-- Usage log for every public API request. Used for rate limiting fallback,
-- per-partner analytics, and acquisition dashboard.

CREATE TABLE IF NOT EXISTS public.api_usage (
  id               uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_id       uuid    NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint         text    NOT NULL CHECK (char_length(endpoint) <= 200),
  status_code      integer,
  response_time_ms integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- Partition-friendly: most queries filter by created_at DESC
CREATE INDEX IF NOT EXISTS api_usage_api_key_id_idx
  ON public.api_usage(api_key_id);
CREATE INDEX IF NOT EXISTS api_usage_created_at_idx
  ON public.api_usage(created_at DESC);
-- Composite index for "count requests for key in last hour" query
CREATE INDEX IF NOT EXISTS api_usage_key_created_idx
  ON public.api_usage(api_key_id, created_at DESC);

-- No direct client access — all reads are admin-only via service role
CREATE POLICY "Admins can read all API usage"
  ON public.api_usage FOR SELECT
  USING (public.is_admin());


-- ── 7. increment_api_key_usage() — atomic server-side counter ────────────────
-- Called from the API middleware via .rpc() to atomically increment
-- request_count and update last_used_at in a single round-trip.

CREATE OR REPLACE FUNCTION public.increment_api_key_usage(key_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.api_keys
  SET request_count = request_count + 1,
      last_used_at  = now()
  WHERE id = key_id;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_api_key_usage(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.increment_api_key_usage(uuid) TO service_role;


-- ── 9. is_agency_owner() helper ──────────────────────────────────────────────
-- Used by middleware and API routes to check if the current user owns an agency.

CREATE OR REPLACE FUNCTION public.is_agency_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agencies
    WHERE owner_user_id = auth.uid()
      AND slug IS NOT NULL
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_agency_owner() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_agency_owner() TO authenticated;


-- ── 10. is_verified_vet() helper ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_verified_vet()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vet_profiles
    WHERE user_id = auth.uid()
      AND verified_at IS NOT NULL
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_verified_vet() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_verified_vet() TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- END OF MIGRATION
-- New env vars needed before deploying Phase 4:
--   NEXT_PUBLIC_BASE_DOMAIN=petborder.com
--   B2B_STRIPE_PRICE_ID=price_...
-- Vercel: add *.petborder.com as a wildcard domain alias
-- ─────────────────────────────────────────────────────────────────────────────
