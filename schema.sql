-- Reserve Passport — full schema + RLS
-- Source of truth: point Claude Code at this file directly rather than
-- letting schema decisions get reinvented mid-session.

-- ============================================================
-- Reserves (static seed data — SANParks / CapeNature / provincial)
-- ============================================================
create table reserves (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org text,               -- 'SANParks' | 'CapeNature' | provincial
  province text,
  lat float8,
  lng float8
);

-- ============================================================
-- Stamps (one row per visit — repeat visits to the same reserve
-- are allowed on purpose, no unique constraint on user+reserve)
-- ============================================================
create table stamps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  reserve_id uuid references reserves not null,
  photo_url text not null,
  write_up text,
  visited_at timestamptz default now(),
  capture_lat float8,     -- optional, from photo metadata
  capture_lng float8,
  is_public boolean not null default false
);

-- ============================================================
-- Profiles (nickname ONLY — isolated from auth.users on purpose,
-- so the public-readable path never exposes email/PII)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id),
  nickname text not null default 'Explorer'
);

-- ============================================================
-- Challenges (seasonal: Summer Sprint, Winter Wonderland, etc.)
-- ============================================================
create table challenges (
  id uuid primary key default gen_random_uuid(),
  name text not null,              -- 'Summer Sprint 2026'
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  target_count int not null,       -- e.g. 5 distinct reserves
  filter jsonb                     -- optional: {"org": "SANParks"} or {"province": "Western Cape"}
);

create table challenge_progress (
  user_id uuid references auth.users not null,
  challenge_id uuid references challenges not null,
  stamp_count int default 0,       -- recomputed as count(distinct reserve_id), not incremented
  completed_at timestamptz,
  primary key (user_id, challenge_id)
);

-- Progress query to run app-side after each stamp insert:
--   select count(distinct reserve_id)
--   from stamps
--   where user_id = $1
--     and visited_at between challenge.starts_at and challenge.ends_at
--     -- plus filter logic if challenge.filter is set
-- Write the result into challenge_progress.stamp_count (recompute, don't increment —
-- self-correcting, no drift risk).

-- ============================================================
-- Friend invites
-- ============================================================
create table invite_codes (
  code text primary key,              -- short, e.g. 6-char alphanumeric
  owner_id uuid references auth.users not null,
  created_at timestamptz default now(),
  expires_at timestamptz,             -- optional, e.g. 7 days
  used_by uuid references auth.users  -- null until redeemed
);

create table friendships (
  user_a uuid references auth.users not null,
  user_b uuid references auth.users not null,
  created_at timestamptz default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)             -- forces one canonical row per pair, no duplicates
);

-- Redemption goes through this function, not a raw client insert — the client
-- shouldn't be trusted to validate the code itself.
create or replace function redeem_invite(invite_code text)
returns void as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from invite_codes
    where code = invite_code and used_by is null
      and (expires_at is null or expires_at > now());
  if v_owner is null then
    raise exception 'Invalid or expired code';
  end if;
  insert into friendships (user_a, user_b)
    values (least(v_owner, auth.uid()), greatest(v_owner, auth.uid()));
  update invite_codes set used_by = auth.uid() where code = invite_code;
end;
$$ language plpgsql security definer;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table stamps enable row level security;
alter table profiles enable row level security;
alter table friendships enable row level security;

-- Stamps: owner sees all of theirs; strangers see only public ones
create policy "users read own stamps"
  on stamps for select
  using (auth.uid() = user_id);

create policy "public stamps are readable"
  on stamps for select
  using (is_public = true or auth.uid() = user_id);

create policy "users insert own stamps"
  on stamps for insert
  with check (auth.uid() = user_id);

-- Profiles: nickname is the only column, self-chosen, not PII — safe to expose
create policy "nicknames are public"
  on profiles for select
  using (true);

create policy "users update own nickname"
  on profiles for update
  using (auth.uid() = id);

-- Friendships: only visible to the two people in them
create policy "see own friendships"
  on friendships for select
  using (auth.uid() = user_a or auth.uid() = user_b);
