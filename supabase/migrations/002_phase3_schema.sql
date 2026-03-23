-- ─────────────────────────────────────────────────────────────────────────────
-- PetBorder Phase 3 — Schema extensions
-- Run once in Supabase SQL editor: supabase.com → SQL Editor → paste → Run
-- Safe to run on top of 001_phase2_schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Extend profiles with role ─────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'free'
  CHECK (role IN ('free', 'paid_once', 'subscriber', 'admin'));

-- Bootstrap first admin (replace with your email or set via ADMIN_EMAIL env var)
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';


-- ── 2. is_admin() helper (SECURITY DEFINER avoids RLS recursion) ─────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
$$;

-- Restrict callable surface: only authenticated users may call is_admin().
-- The anon role should not be able to probe admin status via RPC.
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- ── 3. subscriptions ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id  text UNIQUE,
  stripe_customer_id      text,
  status                  text NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'cancelled', 'past_due')),
  current_period_end      timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- One active subscription per user (unique on user_id)
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_idx
  ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_sub_idx
  ON public.subscriptions(stripe_subscription_id);

-- Subscriptions are written server-side via service role key only —
-- no client INSERT/UPDATE/DELETE policy is intentional.
-- Users can read their own subscription; admins can read all.
CREATE POLICY "Users can read own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (public.is_admin());


-- ── 4. pets ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pets (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  type             text NOT NULL CHECK (type IN ('dog', 'cat')),
  breed            text NOT NULL CHECK (char_length(breed) BETWEEN 1 AND 100),
  microchip_number text CHECK (char_length(microchip_number) <= 50),
  date_of_birth    date,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS pets_user_id_idx ON public.pets(user_id);

CREATE POLICY "Users can read own pets"
  ON public.pets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pets"
  ON public.pets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pets"
  ON public.pets FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pets"
  ON public.pets FOR DELETE USING (auth.uid() = user_id);


-- ── 5. Add pet_id to timelines ───────────────────────────────────────────────

ALTER TABLE public.timelines
  ADD COLUMN IF NOT EXISTS pet_id uuid REFERENCES public.pets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS timelines_pet_id_idx ON public.timelines(pet_id);


-- ── 6. vet_clinics ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vet_clinics (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  text NOT NULL,
  address               text,
  state                 text,
  postcode              text,
  phone                 text,
  email                 text,
  daff_approved         boolean NOT NULL DEFAULT false,
  specialises_in_export boolean NOT NULL DEFAULT false,
  lat                   numeric(10, 7),
  lng                   numeric(10, 7),
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, postcode)
);

ALTER TABLE public.vet_clinics ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS vet_clinics_state_idx ON public.vet_clinics(state);

-- Public read; admin writes via service role
CREATE POLICY "Anyone can read vet clinics"
  ON public.vet_clinics FOR SELECT USING (true);


-- ── 7. approved_labs ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.approved_labs (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                    text NOT NULL,
  country                 text NOT NULL,
  accepts_from_countries  jsonb NOT NULL DEFAULT '[]',
  website                 text,
  turnaround_days         integer,
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, country)
);

ALTER TABLE public.approved_labs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS approved_labs_country_idx ON public.approved_labs(country);

CREATE POLICY "Anyone can read approved labs"
  ON public.approved_labs FOR SELECT USING (true);


-- ── 8. agencies ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agencies (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           text NOT NULL UNIQUE,
  url            text,
  tagline        text,
  description    text,
  services       text[]  NOT NULL DEFAULT '{}',
  price_range    text,
  states_served  text[]  NOT NULL DEFAULT '{}',
  rating         numeric(3, 1),
  contact_email  text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read agencies"
  ON public.agencies FOR SELECT USING (true);


-- ── 9. referral_clicks ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.referral_clicks (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_name  text NOT NULL CHECK (char_length(agency_name) <= 100),
  timeline_id  uuid REFERENCES public.timelines(id) ON DELETE SET NULL,
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  clicked_at   timestamptz NOT NULL DEFAULT now(),
  source_page  text CHECK (char_length(source_page) <= 200)
);

ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS referral_clicks_agency_idx
  ON public.referral_clicks(agency_name);
CREATE INDEX IF NOT EXISTS referral_clicks_clicked_at_idx
  ON public.referral_clicks(clicked_at DESC);

-- Anyone (including anonymous users) can log a click.
-- user_id must be NULL or must match the caller's own auth.uid()
-- to prevent attributing clicks to other users.
CREATE POLICY "Anyone can insert referral clicks"
  ON public.referral_clicks FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Admins can read referral clicks"
  ON public.referral_clicks FOR SELECT USING (public.is_admin());


-- ── 10. Update profiles: admin read-all policy ───────────────────────────────
-- The existing "Users can read own profile" policy (from Phase 2) still applies.
-- This adds admin read-all on top (Supabase ORs multiple SELECT policies).

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());


-- ── 11. Seed: vet clinics (10 Australian DAFF-accredited vets) ───────────────

INSERT INTO public.vet_clinics
  (name, address, state, postcode, phone, email, daff_approved, specialises_in_export, lat, lng)
VALUES
  ('Greencross Vets Toorak', '229 Toorak Rd, Toorak', 'VIC', '3142',
   '(03) 9826 5566', 'toorak@greencrossvets.com.au', true, true, -37.8390, 145.0180),

  ('North Shore Veterinary Hospital', '76 Chandos St, St Leonards', 'NSW', '2065',
   '(02) 9436 4884', 'info@northshorevet.com.au', true, true, -33.8220, 151.1960),

  ('Animal Emergency Centre Underwood', '263 Kessels Rd, Underwood', 'QLD', '4119',
   '(07) 3423 1888', 'info@aec.net.au', true, false, -27.5840, 153.0970),

  ('Murdoch University Veterinary Hospital', '90 South St, Murdoch', 'WA', '6150',
   '(08) 9360 7400', 'vetclinic@murdoch.edu.au', true, true, -32.0640, 115.8350),

  ('SA Veterinary Emergency and Specialists', 'Mooringe Ave, Camden Park', 'SA', '5038',
   '(08) 8371 5777', 'info@saves.net.au', true, false, -34.9490, 138.5400),

  ('Essendon Fields Vet Clinic', 'Ground Level, Building 5, Essendon Fields', 'VIC', '3041',
   '(03) 9336 1244', 'info@efvc.com.au', true, true, -37.7280, 144.9090),

  ('Newtown Veterinary Hospital', '369 King St, Newtown', 'NSW', '2042',
   '(02) 9557 5994', 'info@newtownvet.com.au', true, false, -33.8970, 151.1780),

  ('Brisbane Veterinary Specialist Centre', '139 Wises Rd, Buderim', 'QLD', '4556',
   '(07) 5444 2299', 'info@bvsc.com.au', true, true, -26.6840, 153.0560),

  ('Perth Vet Emergency', '502 Wanneroo Rd, Balcatta', 'WA', '6021',
   '(08) 9204 9333', 'admin@perthvetemergency.com.au', true, false, -31.8660, 115.8420),

  ('Hobart Veterinary Hospital', '176 Liverpool St, Hobart', 'TAS', '7000',
   '(03) 6234 7078', 'info@hobartvet.com.au', true, true, -42.8830, 147.3300)

ON CONFLICT (name, postcode) DO NOTHING;


-- ── 12. Seed: approved labs (5 RNATT-approved international labs) ─────────────

INSERT INTO public.approved_labs
  (name, country, accepts_from_countries, website, turnaround_days, notes)
VALUES
  (
    'Kansas State University Veterinary Diagnostic Laboratory',
    'USA',
    '["USA", "Canada", "Mexico"]'::jsonb,
    'https://www.vet.k-state.edu/vdl',
    10,
    'USDA-approved FAVN (fluorescent antibody virus neutralisation) test. Preferred by DAFF for North American pets.'
  ),
  (
    'Biobest Laboratories Ltd',
    'UK',
    '["UK", "Ireland"]'::jsonb,
    'https://www.biobest.co.uk',
    14,
    'APHA-approved lab. Results accepted by Australian DAFF. Recommended for pets from the UK and Ireland.'
  ),
  (
    'ANSES Nancy Laboratory',
    'France',
    '["France", "Belgium", "Luxembourg", "Switzerland", "Germany", "Netherlands"]'::jsonb,
    'https://www.anses.fr',
    14,
    'French national reference laboratory for rabies. EU-approved RNATT testing. Serves most of western Europe.'
  ),
  (
    'Australian Animal Health Laboratory (AAHL)',
    'Australia',
    '["Australia"]'::jsonb,
    'https://www.csiro.au/aahl',
    7,
    'Biosecurity level 4 facility in Geelong, VIC. For rare cases where RNATT is required while already in Australia.'
  ),
  (
    'Onderstepoort Veterinary Research',
    'South Africa',
    '["South Africa", "Kenya", "Zimbabwe", "Zambia", "Tanzania", "Botswana"]'::jsonb,
    'https://www.ovr.agric.za',
    21,
    'Approved for pets from southern and eastern Africa. Allow extra lead time — results can take 3 weeks.'
  )

ON CONFLICT (name, country) DO NOTHING;


-- ── 13. Seed: agencies (6 pet transport agencies) ────────────────────────────

INSERT INTO public.agencies
  (name, url, tagline, description, services, price_range, states_served, rating, contact_email)
VALUES
  (
    'Petraveller',
    'https://www.petraveller.com.au',
    'Full door-to-door pet relocation service',
    'Australia''s premium pet relocation specialists. Handles all DAFF paperwork, vet coordination, quarantine booking and flight arrangements for international moves.',
    ARRAY['door-to-door', 'vet-coordination', 'quarantine-booking', 'customs-clearance', 'tracking'],
    '$3,000 – $8,000+',
    ARRAY['VIC', 'NSW', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'],
    4.8,
    'info@petraveller.com.au'
  ),
  (
    'Dogtainers',
    'https://www.dogtainers.com.au',
    'Australia''s largest pet transport company',
    'Over 45 years experience moving pets domestically and internationally. Strong reputation for quarantine management and DAFF compliance.',
    ARRAY['door-to-door', 'vet-coordination', 'quarantine-booking', 'customs-clearance', 'tracking'],
    '$2,500 – $7,000+',
    ARRAY['VIC', 'NSW', 'QLD', 'WA', 'SA'],
    4.6,
    'info@dogtainers.com.au'
  ),
  (
    'Jetpets',
    'https://www.jetpets.com.au',
    'International & domestic pet travel specialists',
    'Award-winning pet travel company with dedicated import specialists and 24/7 flight tracking. Strong DAFF compliance record.',
    ARRAY['door-to-door', 'vet-coordination', 'quarantine-booking', 'customs-clearance', 'tracking'],
    '$2,800 – $7,500+',
    ARRAY['VIC', 'NSW', 'QLD', 'WA', 'SA', 'TAS'],
    4.7,
    'international@jetpets.com.au'
  ),
  (
    'PetExpress',
    'https://www.petexpress.com.au',
    'Reliable pet shipping across Australia and internationally',
    'Specialist in companion animal transport. Good option for budget-conscious moves with less full-service support.',
    ARRAY['door-to-door', 'customs-clearance'],
    '$1,800 – $5,000',
    ARRAY['VIC', 'NSW', 'QLD'],
    4.2,
    'info@petexpress.com.au'
  ),
  (
    'World Care Pet',
    'https://www.worldcarepet.com',
    'Compassionate global pet relocation',
    'US-based agency with strong Australia import expertise. Ideal for moves from North America with full DAFF process management.',
    ARRAY['door-to-door', 'vet-coordination', 'quarantine-booking', 'customs-clearance'],
    '$4,000 – $10,000+',
    ARRAY['VIC', 'NSW', 'QLD', 'WA'],
    4.5,
    'australia@worldcarepet.com'
  ),
  (
    'Starwood Animal Transport',
    'https://www.starwoodanimaltransport.com',
    'Premium international pet relocation',
    'High-end white-glove service for complex international moves. Particularly strong for Group 3 country relocations from Europe and North America.',
    ARRAY['door-to-door', 'vet-coordination', 'quarantine-booking', 'customs-clearance', 'tracking'],
    '$5,000 – $12,000+',
    ARRAY['VIC', 'NSW'],
    4.7,
    'sydney@starwoodanimaltransport.com'
  )

ON CONFLICT (name) DO NOTHING;


-- ── 14. Patch profiles UPDATE policy to prevent role self-escalation ──────────
-- The Phase 2 update policy allows users to change any column in their own
-- profile row. Now that we have a `role` column, a user could call
-- .from('profiles').update({ role: 'admin' }) and self-promote.
-- We replace the existing policy with one that prevents role changes by
-- enforcing the stored role stays the same after any client update.

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- END OF MIGRATION
-- After running this migration, set the first admin:
--   UPDATE public.profiles SET role = 'admin' WHERE email = '<ADMIN_EMAIL>';
-- ─────────────────────────────────────────────────────────────────────────────
