-- ─────────────────────────────────────────────────────────────────────────────
-- PetBorder Phase 2 — Initial schema
-- Run this in Supabase SQL editor or via supabase db push
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension (already on by default in Supabase, but safe to re-run)
create extension if not exists "uuid-ossp";

-- ── profiles ─────────────────────────────────────────────────────────────────
-- Mirrors auth.users; created automatically via trigger on signup.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── timelines ────────────────────────────────────────────────────────────────
create table if not exists public.timelines (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  origin_country  text not null,
  travel_date     date not null,
  pet_type        text not null check (pet_type in ('dog', 'cat')),
  pet_breed       text not null,
  daff_group      smallint not null check (daff_group in (1, 2, 3)),
  generated_steps jsonb not null default '[]',
  created_at      timestamptz not null default now()
);

alter table public.timelines enable row level security;

create policy "Users can read own timelines"
  on public.timelines for select
  using (auth.uid() = user_id);

create policy "Users can insert own timelines"
  on public.timelines for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own timelines"
  on public.timelines for delete
  using (auth.uid() = user_id);

create index if not exists timelines_user_id_idx on public.timelines(user_id);
create index if not exists timelines_created_at_idx on public.timelines(created_at desc);


-- ── timeline_progress ────────────────────────────────────────────────────────
create table if not exists public.timeline_progress (
  id          uuid primary key default uuid_generate_v4(),
  timeline_id uuid not null references public.timelines(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  step_index  smallint not null,
  completed_at timestamptz not null default now(),
  unique (timeline_id, step_index)
);

alter table public.timeline_progress enable row level security;

create policy "Users can read own progress"
  on public.timeline_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own progress"
  on public.timeline_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own progress"
  on public.timeline_progress for delete
  using (auth.uid() = user_id);

create index if not exists progress_timeline_id_idx on public.timeline_progress(timeline_id);
create index if not exists progress_user_id_idx on public.timeline_progress(user_id);


-- ── purchases ────────────────────────────────────────────────────────────────
create table if not exists public.purchases (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  timeline_id       uuid references public.timelines(id) on delete set null,
  stripe_session_id text not null unique,
  amount_cents      integer not null,
  paid_at           timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

alter table public.purchases enable row level security;

create policy "Users can read own purchases"
  on public.purchases for select
  using (auth.uid() = user_id);

-- Purchases are inserted server-side via service role key only —
-- no client insert policy needed.

create index if not exists purchases_user_id_idx on public.purchases(user_id);
create index if not exists purchases_stripe_session_idx on public.purchases(stripe_session_id);
