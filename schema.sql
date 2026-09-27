-- Reserve Passport — full schema + RLS
-- Source of truth: point Claude Code at this file directly rather than
-- letting schema decisions get reinvented mid-session.
--
-- RLS rule of thumb: EVERY table in `public` has RLS enabled. In Supabase a
-- table without RLS is readable AND writable by anyone holding the anon key,
-- which ships inside the app. No policy for an action = that action is denied.

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

-- Names are unique so the seed (supabase/seed-reserves.sql) can add/update by name.
create unique index reserves_name_key on reserves (name);

-- ============================================================
-- Stamps (one row per visit — repeat visits to the same reserve
-- are allowed on purpose, no unique constraint on user+reserve)
-- ============================================================
create table stamps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  reserve_id uuid references reserves not null,
  photo_url text not null, -- storage object PATH in the private `stamp-photos`
                           -- bucket ('<user_id>/<file>.jpg'), not a public URL.
                           -- The app turns it into a short-lived signed URL.
  write_up text,
  visited_at timestamptz default now(),
  capture_lat float8,     -- optional, from photo metadata
  capture_lng float8,
  is_public boolean not null default false
);

create index stamps_user_id_idx on stamps (user_id);
create index stamps_reserve_id_idx on stamps (reserve_id);

-- ============================================================
-- Profiles (nickname ONLY — isolated from auth.users on purpose,
-- so the public-readable path never exposes email/PII)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default 'Explorer'
    check (char_length(nickname) between 1 and 30)
);

-- Every new user (anonymous or not) gets a profile row automatically.
-- The client never inserts profiles itself.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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
-- `set search_path = ''` + fully-qualified names: standard hardening for
-- security definer functions (stops search_path hijacking).
create or replace function public.redeem_invite(invite_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_owner uuid;
begin
  if v_me is null then
    raise exception 'Not signed in';
  end if;

  -- `for update` locks the code row so two people can't redeem it at once
  select owner_id into v_owner from public.invite_codes
    where code = invite_code and used_by is null
      and (expires_at is null or expires_at > now())
    for update;
  if v_owner is null then
    raise exception 'Invalid or expired code';
  end if;
  if v_owner = v_me then
    raise exception 'You can''t redeem your own invite code';
  end if;

  -- Already friends? Not an error — just don't duplicate the row.
  insert into public.friendships (user_a, user_b)
    values (least(v_owner, v_me), greatest(v_owner, v_me))
    on conflict do nothing;
  update public.invite_codes set used_by = v_me where code = invite_code;
end;
$$;

-- Only signed-in users (anonymous sign-in counts) may call it.
revoke execute on function public.redeem_invite(text) from public, anon;
grant execute on function public.redeem_invite(text) to authenticated;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table reserves enable row level security;
alter table stamps enable row level security;
alter table profiles enable row level security;
alter table challenges enable row level security;
alter table challenge_progress enable row level security;
alter table invite_codes enable row level security;
alter table friendships enable row level security;

-- Reserves + challenges: read-only reference data. No write policies, so the
-- app can't modify them — seed/edit them from the Supabase dashboard or SQL.
create policy "reserves are readable"
  on reserves for select
  using (true);

create policy "challenges are readable"
  on challenges for select
  using (true);

-- Stamps: owner sees all of theirs; everyone else sees only public ones
create policy "read own or public stamps"
  on stamps for select
  using (is_public = true or auth.uid() = user_id);

create policy "users insert own stamps"
  on stamps for insert
  with check (auth.uid() = user_id);

create policy "users update own stamps"   -- edit write-up, toggle public/private
  on stamps for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own stamps"
  on stamps for delete
  using (auth.uid() = user_id);

-- Profiles: nickname is the only column, self-chosen, not PII — safe to expose.
-- Rows are created by the handle_new_user trigger, so no insert policy.
create policy "nicknames are public"
  on profiles for select
  using (true);

create policy "users update own nickname"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Challenge progress: private to its owner. Written app-side (see note above).
-- NOTE: because the client writes this, a tampered client could fake progress.
-- Fine while there are no prizes; the planned move to a Postgres trigger fixes it.
create policy "read own progress"
  on challenge_progress for select
  using (auth.uid() = user_id);

create policy "insert own progress"
  on challenge_progress for insert
  with check (auth.uid() = user_id);

create policy "update own progress"
  on challenge_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Invite codes: only the owner can see/create/delete their codes. Nobody can
-- browse other people's codes; redemption happens only via redeem_invite().
create policy "read own invite codes"
  on invite_codes for select
  using (auth.uid() = owner_id);

create policy "create own invite codes"
  on invite_codes for insert
  with check (auth.uid() = owner_id and used_by is null);

create policy "delete own invite codes"
  on invite_codes for delete
  using (auth.uid() = owner_id);

-- Friendships: only visible to the two people in them. Created only via
-- redeem_invite(); either person can end it.
create policy "see own friendships"
  on friendships for select
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "remove own friendships"
  on friendships for delete
  using (auth.uid() = user_a or auth.uid() = user_b);

-- ============================================================
-- Storage: stamp photos
-- ============================================================
-- PRIVATE bucket. A public bucket would make "private" stamps viewable by
-- anyone with the link. Files live at '<user_id>/<file>.jpg'.
insert into storage.buckets (id, name, public)
  values ('stamp-photos', 'stamp-photos', false);

create policy "users upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'stamp-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users read own photos"
  on storage.objects for select
  using (
    bucket_id = 'stamp-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- A photo becomes viewable to others only while its stamp is public.
-- Flip the stamp back to private and access is revoked.
create policy "photos of public stamps are readable"
  on storage.objects for select
  using (
    bucket_id = 'stamp-photos'
    and exists (
      select 1 from public.stamps s
      where s.photo_url = storage.objects.name and s.is_public = true
    )
  );

create policy "users delete own photos"
  on storage.objects for delete
  using (
    bucket_id = 'stamp-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
