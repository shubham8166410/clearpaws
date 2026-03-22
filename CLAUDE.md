# ClearPaws — Claude Code Project Config

## What this product is
ClearPaws (clearpaws.com.au) is an AI-powered pet travel compliance 
planner for Australia. Pet owners enter 3 things — where they're 
moving from, when they want to travel, and what pet they have — and 
get a personalised step-by-step DAFF compliance timeline with exact 
dates, cost estimates, and a downloadable checklist.

## Business model
- Free: generate a basic timeline (rate limited 5/day per IP)
- Paid ($49 AUD): full document pack PDF download via Stripe
- Referral: CTA to Petraveller/Dogtainers/Jetpets ($50-150/lead)

## Stack
- Next.js 14 App Router, TypeScript, Tailwind CSS
- Supabase (auth + PostgreSQL database)
- Anthropic Claude API (claude-sonnet-4-20250514) for timeline generation
- Stripe for payments ($49 AUD one-time)
- @react-pdf/renderer for PDF generation (server-side only)
- Resend for transactional email
- Vercel for deployment

## Current phase
Phase 1 MVP — timeline generator only, no auth, no payments yet.
Focus: 3-step form → AI timeline → referral CTA.

## Core domain knowledge — DAFF rules (always apply)
Australia groups origin countries into 3 categories:
- Group 1 (NZ, Norfolk Island): no quarantine, no import permit needed
- Group 2 (UK, Ireland, Hawaii): rabies-free, simpler process, 10-day quarantine
- Group 3 (USA, Europe, Asia): requires RNATT blood test with mandatory 
  180-day wait from lab receipt date, import permit ($1,265 AUD), 
  minimum 10-30 days quarantine at Mickleham facility Melbourne

Critical rules:
- ALL pets must fly into Melbourne only (no other airport accepted)
- Microchip must be ISO compliant and implanted BEFORE rabies vaccination
- RNATT 180-day wait starts from date lab RECEIVES sample, not draw date
- Identity verification must happen BEFORE RNATT for 10-day quarantine
- If identity verified after RNATT = 30 day quarantine (not 10)
- Import permit costs $1,265 AUD via BICON portal
- Health certificate must be completed within 5 days before export
- Bengal cats banned from import as of March 2026
- Quarantine at Mickleham — must book in advance, limited spots

## API routes
- POST /api/generate-timeline — main AI route, rate limited
- POST /api/checkout — Stripe checkout session (Phase 2)
- POST /api/webhook/stripe — Stripe webhook (Phase 2)
- GET /api/countries — returns DAFF group classification for all countries

## Security rules (always enforce)
- Rate limit /api/generate-timeline: 5 requests per IP per day
- Validate all inputs with Zod before hitting Claude API
- ANTHROPIC_API_KEY and STRIPE keys must be server-side only, never 
  in any client component or exposed to browser
- Sanitise all user text inputs — never pass raw user input to Claude
- Use Supabase Row Level Security (RLS) on all tables when auth is added
- HTTPS enforced by Vercel automatically

## Code conventions
- All API routes use Zod for request/response validation
- Server Components by default, only use 'use client' when needed
- PDF generation server-side only — never in browser
- All monetary amounts in AUD cents for Stripe
- No console.log in production code
- TypeScript strict mode — no any types
- Tests for all API routes and Zod schemas

## File structure
src/
  app/
    api/
      generate-timeline/route.ts   ← main AI endpoint
      countries/route.ts           ← country group lookup
    (marketing)/
      page.tsx                     ← landing page
    generate/
      page.tsx                     ← 3-step form UI
    layout.tsx
  components/
    timeline/
      TimelineForm.tsx             ← 3-step input form
      TimelineResult.tsx           ← result display
      TimelineStep.tsx             ← individual step card
    ui/                            ← shared primitives
  lib/
    anthropic.ts                   ← Claude client + system prompt
    countries.ts                   ← DAFF country classification data
    timeline-schema.ts             ← Zod schemas
    rate-limit.ts                  ← IP-based rate limiting
  types/
    timeline.ts                    ← TypeScript types

## Key commands inside Claude Code
/plan          — plan a feature before building
/tdd           — write tests first, then implement
/code-review   — review current code quality
/build-fix     — fix TypeScript or build errors
/security-scan — scan for security issues before deploying
/multi-frontend — build multiple UI components in parallel
/learn         — save patterns from this session
/checkpoint    — save state at a stable milestone@AGENTS.md

## Current phase
Phase 2 — Accounts, payments, saved timelines, progress tracker.
Phase 1 (timeline generator) is complete and working.

## Phase 2 features
- Supabase Auth: email/password + Google OAuth
- Save generated timeline to user account
- Progress tracker: tick off completed steps
- Stripe payment: $49 AUD one-time for document pack PDF
- Email reminders via Resend for upcoming DAFF deadlines
- User dashboard: view saved timelines and progress

## Database tables (Supabase)
- profiles: id, email, created_at
- timelines: id, user_id, origin_country, travel_date, pet_type,
  pet_breed, daff_group, generated_steps (jsonb), created_at
- timeline_progress: id, timeline_id, user_id, step_index, completed_at
- purchases: id, user_id, timeline_id, stripe_session_id,
  amount_cents, paid_at, created_at

## Security additions for Phase 2
- Supabase RLS enabled on ALL tables
- Users can only read/write their own rows
- Stripe webhook must verify signature before any DB write
- Service role key only used server-side, never in client components

## New env vars needed
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
RESEND_API_KEY=
CRON_SECRET=

## Current phase
Phase 3 — Subscription, vet finder, approved lab finder,
multi-pet support, agency comparison, admin dashboard.
Phase 1 and Phase 2 are complete and working.

## Phase 3 features
- Monthly subscription ($9.90 AUD/mo) via Stripe recurring billing
- Vet finder — map of DAFF-approved vets by Australian state/postcode
- Approved lab finder — DAFF-approved RNATT labs by country
- Multi-pet support — manage timelines for 2+ pets travelling together
- Agency comparison — Petraveller vs Dogtainers vs Jetpets with
  real pricing ranges, links and reviews summary
- Admin dashboard — referral clicks, document sales, user growth,
  revenue overview
- Role-based access: free / paid_once / subscriber / admin

## Phase 3 database additions
- subscriptions: id, user_id, stripe_subscription_id,
  status, current_period_end, created_at
- pets: id, user_id, name, type, breed, microchip_number,
  date_of_birth, created_at
- vet_clinics: id, name, address, state, postcode, phone,
  email, daff_approved, specialises_in_export, lat, lng
- approved_labs: id, name, country, accepts_from_countries (jsonb),
  website, turnaround_days, notes
- referral_clicks: id, agency_name, timeline_id, user_id,
  clicked_at, source_page

## Phase 3 security additions
- Role-based access control via Supabase RLS and user metadata
- Subscription status checked server-side before serving premium routes
- Admin routes protected by admin role check in middleware
- Stripe subscription webhook handles created, updated, deleted,
  payment_failed events

## Phase 3 new env vars needed
STRIPE_SUBSCRIPTION_PRICE_ID=price_...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
ADMIN_EMAIL=your@email.com

## Current phase
Phase 4 — B2B white-label portal, agency lead dashboard,
vet portal, public API, acquisition-ready analytics.
Phases 1, 2 and 3 are complete and working.

## Phase 4 features

### White-label agency portal
- Agencies (Petraveller, Dogtainers, Jetpets) get their own
  subdomain: petraveller.clearpaws.com.au
- ClearPaws timeline tool renders under agency branding
  (logo, colours, contact details all customisable)
- All leads generated through white-label are tagged to that agency
- Agency sees their leads in real-time dashboard
- Setup fee: $299 one-time + $299/month (B2B pricing)

### Agency lead dashboard
- Each agency gets a login to agency.clearpaws.com.au
- Dashboard shows: all referral leads, pet details,
  origin country, travel date, contact info, status
- Lead status: new / contacted / converted / lost
- Export leads as CSV
- Email notification when new lead arrives

### Vet portal
- DAFF-approved vets register at vet.clearpaws.com.au
- Dashboard shows their export clients and timelines
- Vets can see what documents each client needs
- Vets can mark steps as completed on behalf of client
- Vet profile shows on ClearPaws vet finder map

### Public API
- REST API for agencies to integrate timeline engine
- POST /api/v1/timeline — generate timeline programmatically
- GET /api/v1/countries — country group data
- API key authentication (not JWT)
- Rate limited per API key
- Usage tracked per key
- Swagger/OpenAPI documentation at /api/docs

### Acquisition-ready dashboard (admin only)
- MRR chart (subscriptions + one-time purchases)
- User growth chart (total, weekly new, churn)
- Referral conversion rate per agency
- Top origin countries
- Average timeline to purchase
- API usage by partner
- White-label portal usage
- All data exportable as CSV

## Phase 4 database additions
- agencies: id, name, slug, logo_url, primary_colour,
  contact_email, stripe_subscription_id, created_at
- agency_leads: id, agency_id, timeline_id, pet_owner_email,
  pet_owner_name, status, notes, created_at
- vet_profiles: id, user_id, clinic_id, ahpra_number,
  daff_approved, verified_at, created_at
- api_keys: id, user_id, agency_id, key_hash, name,
  last_used_at, request_count, is_active, created_at
- api_usage: id, api_key_id, endpoint, created_at

## Phase 4 security
- API keys hashed with bcrypt before storing — never store raw
- API key middleware validates hash on every request
- White-label subdomains validated against agencies table
- Vet portal requires manual admin verification before access
- Agency dashboard uses separate RLS policy — agencies
  see only their own leads
- Public API rate limited: 100 requests per hour per key
- OpenAPI docs show no secret implementation details

## Phase 4 new env vars
NEXT_PUBLIC_BASE_DOMAIN=clearpaws.com.au
B2B_STRIPE_PRICE_ID=price_...  ← $299/mo agency subscription

## Accuracy system
ClearPaws must achieve 99%+ accuracy on DAFF compliance
information. This is a three-layer system:

Layer 1 — Hardcoded knowledge base
All stable DAFF rules stored in src/lib/daff-rules.ts
and src/lib/countries.ts. Each rule has a source URL
and last-verified date as a comment. This is the
primary source for AI prompt context. Claude API
never guesses rules — it only uses rules explicitly
provided in the system prompt from these files.

Layer 2 — Weekly DAFF monitoring
Cron job scrapes official DAFF pages weekly.
Content hash comparison detects any changes.
Admin email alert sent when change detected.
Admin reviews and approves before knowledge base updates.
No rule change goes live without human review.

Layer 3 — Live data fetch
Mickleham quarantine availability fetched at query time.
BICON processing time estimates fetched weekly.
Cached with 24-hour TTL and fallback to stale cache.

Claude API usage rule (critical):
The AI is NEVER asked to recall DAFF rules from training.
Every API call includes the full rules as context:
"Here are the current DAFF rules: [rules from daff-rules.ts]
Use ONLY these rules to generate the timeline.
Do not add rules not listed here.
If unsure about any rule, say so explicitly."

This eliminates hallucination entirely for rule-based content.
The AI is used only for:
- Natural language generation of step descriptions
- Calculating dates from the provided rules
- Formatting the output
- Writing plain English explanations

Source citations:
Every timeline step must include a sourceUrl field pointing
to the official DAFF page that contains that rule.
These are shown to users as "Verify at [official source]" links.

Disclaimer shown on every timeline:
"This timeline is based on DAFF rules last verified [date].
Requirements can change. Always confirm with DAFF at
agriculture.gov.au before booking travel for your pet.
ClearPaws is a planning tool, not legal or veterinary advice."