# PetBorder

PetBorder is an AI-powered pet travel compliance planner for Australia. Pet owners enter three things — where they are moving from, when they want to travel, and what pet they have — and receive a personalised step-by-step DAFF compliance timeline with exact dates, real cost estimates, and every requirement written in plain English. The product runs across four phases: a free timeline generator, paid accounts and document packs, a subscription tier with premium features, and a B2B white-label platform for pet transport agencies.

**Live site:** [petborder.com](https://petborder.com)
**Vercel dashboard:** [vercel.com/dashboard](https://vercel.com/dashboard)
**Supabase dashboard:** [supabase.com/dashboard](https://supabase.com/dashboard)

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict mode, no `any`) |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Payments | Stripe (one-time + recurring subscriptions) |
| Email | Resend |
| PDF | `@react-pdf/renderer` (server-side only) |
| Validation | Zod v4 on all API routes |
| Testing | Vitest + happy-dom |
| Deployment | Vercel (with cron jobs) |
| Routing middleware | `src/proxy.ts` (Next.js 16 proxy convention) |

---

## Running locally

### Prerequisites

- Node.js 20 or higher
- A [Supabase](https://supabase.com) project (free tier is fine)
- An [Anthropic](https://console.anthropic.com) API key
- A [Stripe](https://stripe.com) account in test mode
- A [Resend](https://resend.com) account

### 1. Clone and install

```bash
git clone https://github.com/your-org/petborder.git
cd petborder
npm install
```

### 2. Configure environment variables

```bash
cp .env.production.example .env.local
```

Open `.env.local` and fill in every value. The file has comments explaining where to find each one. All variables are required for full functionality — see the [Environment variables](#environment-variables) section below.

### 3. Apply database migrations

Open the Supabase dashboard for your project, go to the SQL Editor, and run each migration file in order:

```
supabase/migrations/001_phase2_schema.sql
supabase/migrations/002_phase3_schema.sql
supabase/migrations/003_phase4_schema.sql
supabase/migrations/004_daff_monitoring.sql
```

Alternatively, with the Supabase CLI:

```bash
supabase db push
```

### 4. Configure Supabase Auth

In your Supabase dashboard → Authentication → URL Configuration:

- **Site URL:** `http://localhost:3000`
- **Redirect URLs:** add `http://localhost:3000/auth/callback`

To enable Google OAuth: Authentication → Providers → Google → enable and add your Client ID and Secret from [Google Cloud Console](https://console.cloud.google.com).

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment variables

All variables are required in production. Copy `.env.production.example` to `.env.local` and fill in each value.

| Variable | Used for |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API — timeline generation |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (safe to expose) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin operations — never expose to browser |
| `STRIPE_SECRET_KEY` | Stripe payments — server-side only |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (safe to expose) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |
| `STRIPE_PRICE_ID` | Price ID for the $49 AUD one-time document pack |
| `STRIPE_SUBSCRIPTION_PRICE_ID` | Price ID for the $9.90 AUD/month subscription |
| `B2B_STRIPE_PRICE_ID` | Price ID for the $299 AUD/month agency portal |
| `RESEND_API_KEY` | Transactional email — deadline reminders and DAFF alerts |
| `NEXT_PUBLIC_BASE_DOMAIN` | Production domain, e.g. `petborder.com` |
| `ADMIN_EMAIL` | Receives DAFF rule-change alerts and vet registration notifications |
| `CRON_SECRET` | Secures cron endpoints — generate with `openssl rand -hex 32` |

---

## Running tests

```bash
# Run all unit tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

Tests live in `__tests__/` and are organised to mirror the source structure. Coverage thresholds are set to 80% lines, functions, and branches in `vitest.config.ts`. Key test files:

- `__tests__/lib/daff-rules.test.ts` — regression guards for DAFF compliance rules (rnattWaitDays, quarantine days, breed bans)
- `__tests__/lib/timeline-schema.test.ts` — Zod validation for timeline input/output
- `__tests__/api/` — API route tests using mock Supabase clients

---

## Deploying

### Vercel (recommended)

1. Push to the `main` branch — Vercel deploys automatically.
2. Add all environment variables in Vercel → Project → Settings → Environment Variables.
3. Set Stripe webhook endpoint to `https://petborder.com/api/webhook/stripe` — copy the signing secret to `STRIPE_WEBHOOK_SECRET`.
4. Vercel activates the cron jobs in `vercel.json` automatically in production.

### Manual production build

```bash
npm run build   # must pass before pushing
npm run start   # preview production build locally
```

### Cron jobs

Configured in `vercel.json` and secured by `CRON_SECRET`:

| Endpoint | Schedule | Purpose |
|---|---|---|
| `/api/cron/reminders` | Daily 9am UTC | Emails users whose compliance steps are due within 14 days |
| `/api/cron/daff-scrape` | Sunday 11pm UTC | Scrapes DAFF pages, detects content changes, emails admin alert |

---

## Project structure

```
petborder/
├── src/
│   ├── app/
│   │   ├── (marketing)/          # Landing page (unauthenticated)
│   │   ├── admin/                # Admin dashboard — role-gated
│   │   │   ├── acquisition/      # MRR, user growth, referral metrics
│   │   │   ├── daff-monitor/     # Review detected DAFF rule changes
│   │   │   ├── users/            # User management
│   │   │   └── vets/             # Vet verification queue
│   │   ├── agency-portal/        # B2B agency lead dashboard
│   │   │   ├── leads/            # Lead table with inline status updates
│   │   │   ├── api-keys/         # API key management
│   │   │   └── settings/         # Branding — logo, colours, contact email
│   │   ├── api/
│   │   │   ├── generate-timeline/ # Core AI endpoint — rate limited 5/day/IP
│   │   │   ├── timelines/         # CRUD + progress tracking + PDF
│   │   │   ├── checkout/          # Stripe one-time $49 session
│   │   │   ├── subscription/      # Stripe recurring billing + portal
│   │   │   ├── webhook/stripe/    # Stripe webhook — signature verified
│   │   │   ├── cron/              # Scheduled jobs (reminders, DAFF scraper)
│   │   │   ├── admin/             # Admin-only API routes
│   │   │   ├── v1/                # Public REST API (API key auth)
│   │   │   ├── agency-leads/      # Lead pipeline for agency portal
│   │   │   ├── agencies/          # Agency settings and click tracking
│   │   │   ├── agency/checkout/   # Stripe B2B $299/mo session
│   │   │   ├── api-keys/          # API key creation and management
│   │   │   └── vet/               # Vet registration and step completion
│   │   ├── auth/callback/        # OAuth code exchange, new user detection
│   │   ├── dashboard/            # User dashboard — timelines, pets, finders
│   │   ├── generate/             # 3-step timeline generator form
│   │   ├── login/ signup/        # Auth pages
│   │   ├── vet-portal/           # Vet registration and client management
│   │   └── wl/[slug]/            # White-label subdomain pages
│   ├── components/
│   │   ├── auth/                 # LoginForm, SignupForm
│   │   ├── dashboard/            # DashboardTimelines, WelcomeToast, ProgressTracker
│   │   ├── layout/               # Header, Footer, NavigationProgress
│   │   ├── timeline/             # TimelineForm, TimelineResult, TimelineStep
│   │   ├── ui/                   # Button, Input, Alert, Select (shared primitives)
│   │   └── whitelabel/           # AgencyBrandingProvider, LeadCaptureForm
│   ├── lib/
│   │   ├── anthropic.ts          # Claude client — injects daff-rules.ts as context
│   │   ├── daff-rules.ts         # Hardcoded DAFF rules with source URLs (Layer 1)
│   │   ├── daff-monitor.ts       # DAFF page scraper and hash comparison (Layer 2)
│   │   ├── mickleham.ts          # Live quarantine availability with 24h cache (Layer 3)
│   │   ├── countries.ts          # DAFF group classification for all origin countries
│   │   ├── stripe.ts             # Stripe client and price ID constants
│   │   ├── email.ts              # Resend deadline reminder email template
│   │   ├── api-middleware.ts     # API key authentication for v1 endpoints
│   │   ├── api-keys.ts           # bcrypt key hashing — raw keys never stored
│   │   ├── rate-limit.ts         # IP-based rate limiting (5 req/day free tier)
│   │   ├── sanitize.ts           # Input sanitisation before Claude API calls
│   │   ├── subscription.ts       # User role and subscription status helpers
│   │   ├── pdf/TimelinePdf.tsx   # @react-pdf/renderer template (server-side only)
│   │   └── supabase/             # Server, client, and proxy Supabase factories
│   ├── hooks/
│   │   └── useSubscription.ts    # Client-side subscription status
│   ├── types/                    # TypeScript interfaces for all phases
│   └── proxy.ts                  # Next.js 16 routing middleware — subdomain handling
├── supabase/
│   └── migrations/               # SQL migrations — apply in order (001 → 004)
├── __tests__/                    # Vitest unit tests mirroring src/ structure
├── .env.production.example       # All required env vars with descriptions
├── vercel.json                   # Cron job configuration
└── vitest.config.ts              # Test configuration with 80% coverage threshold
```

---

## Phase summary

### Phase 1 — Timeline generator
Free tool at `/generate`. Three-step form collects origin country, travel date, and pet details. Submits to `POST /api/generate-timeline` which validates input with Zod, injects the full DAFF rule set from `daff-rules.ts` as context, calls the Claude API, and returns a structured compliance timeline. Rate limited to 5 requests per IP per day. No account required.

### Phase 2 — Accounts and payments
Supabase Auth with email/password and Google OAuth. Users can save generated timelines to their account. A one-time $49 AUD Stripe payment unlocks a professional PDF document pack generated server-side with `@react-pdf/renderer`. Stripe webhook at `/api/webhook/stripe` writes purchase records after signature verification. Resend sends deadline reminder emails via a daily Vercel cron job.

### Phase 3 — Subscription and premium features
$9.90 AUD/month Stripe subscription gives users a progress tracker to tick off completed steps, multi-pet profile management, a map of DAFF-approved export vets filtered by state, a directory of RNATT-approved laboratories by country, and a comparison table of Petraveller, Dogtainers, and Jetpets with pricing and direct referral links.

### Phase 4 — B2B white-label platform
Pet transport agencies pay $299 AUD/month for a white-label portal (`[slug].petborder.com`) where their customers use the timeline tool under the agency's branding. Agencies log in to `agency.petborder.com` to view leads, update statuses, export CSV, and manage API keys. A public REST API (`/api/v1`) allows agencies to integrate the timeline engine programmatically. Vets can register at `vet.petborder.com` and manage export clients. An admin dashboard tracks MRR, user growth, referral clicks, and API usage.

---

## Accuracy system

DAFF compliance information must be correct. PetBorder uses three layers:

**Layer 1 — Hardcoded knowledge base**
All stable DAFF rules are stored in `src/lib/daff-rules.ts` with source URLs and verified dates. The Claude API is never asked to recall rules from training data. Every call to the AI includes the full rule set explicitly: *"Here are the current DAFF rules. Use only these rules. Do not add rules not listed here."*

**Layer 2 — Weekly monitoring**
`GET /api/cron/daff-scrape` runs every Sunday. It fetches the official DAFF pages, hashes the content, compares against the previous snapshot in the `daff_snapshots` table, and emails the admin if any page has changed. No rule change goes live without human review.

**Layer 3 — Live data**
Mickleham Post Entry Quarantine Facility availability is fetched at query time from the DAFF website and cached for 24 hours with a stale fallback.

---

## Security notes

- All API routes validate requests with Zod before any database or AI operation
- Stripe webhook signature is verified on every request before writing to the database
- API keys are bcrypt-hashed before storage — the raw key is shown once on creation and never stored
- Supabase Row Level Security is enabled on all tables — users can only read and write their own rows
- The Claude API key, Stripe secret key, and Supabase service role key are server-side only and never exposed to the browser
- Cron endpoints require `Authorization: Bearer <CRON_SECRET>` to prevent unauthorised invocations
- Origin validation on Stripe checkout routes prevents open-redirect attacks via crafted headers
