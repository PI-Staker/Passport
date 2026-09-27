# Reserve Passport — Project Brief

## Concept
A mobile app that works like a passport for South Africa's national and provincial
nature reserves. Visit a reserve, photograph the entrance sign, get a stamp. Add an
optional write-up. Over time it becomes a personal travel journal plus a collection
game — "get the stamp," no loyalty-card gimmick attached.

## Stack
- **React Native (Expo)** — single codebase, trivial camera access, fast on-device
  iteration via Expo Go. Chosen specifically for a vibe-coding loop: you want to see
  changes on your phone constantly, not fight a build pipeline.
- **Supabase** — Postgres + Auth + Storage in one, generous free tier. Avoids
  hand-rolling auth or an image upload pipeline.
- **Reserves as static seed data** (JSON, `data/reserves.json`) rather than an admin
  panel — SANParks + CapeNature + provincial reserves is a finite, slow-changing list.
  Worth having Claude Code write a one-off script to compile this from SANParks' site
  rather than hand-typing it.

## Core principle: minimal data, privacy by construction
This isn't a bolt-on — it shaped the schema. Specifics below, but the summary:
- **Anonymous auth by default.** No email, no password, no signup screen. Supabase
  anonymous sign-in gives every install a UUID and session immediately.
- **Optional email upgrade** (magic link / OTP only, never a password) lets a user
  back up their passport across devices. This *upgrades* the anonymous session —
  existing stamps carry over, nothing is re-created.
- **Nicknames are the only public-facing identity**, and live in their own table,
  isolated from `auth.users` (where the optional email sits). No join ever exposes
  email in a public-readable path. If the app's anon key were ever exposed, the worst
  a stranger could see is a UUID, a self-chosen nickname, and whatever stamps the user
  explicitly marked public.
- **Public/private is opt-in per stamp**, default private. A public stamp displays
  "signed by [nickname]" — nothing else.

## Data model — see `schema.sql` for full DDL + RLS
- `reserves` — seed data, static
- `stamps` — one row per visit, **repeat visits to the same reserve are allowed**
  (no unique constraint on user+reserve — this was a deliberate decision, don't
  "clean it up" into a unique constraint later)
- `profiles` — nickname only, isolated from `auth.users` on purpose
- `challenges` / `challenge_progress` — seasonal challenges (Summer Sprint, Winter
  Wonderland, etc.), see below
- `invite_codes` / `friendships` — friend linking via short codes, see below

## Challenges
- Time-boxed (`starts_at`/`ends_at`), target a count of **distinct reserves**, not
  raw stamp count — revisiting one favourite reserve five times should not complete
  a challenge; the point is exploring new places.
- Optional `filter` (jsonb) lets a challenge scope to an org or province, e.g.
  `{"org": "CapeNature"}` for a winter-specific challenge, without a schema change —
  just a new row in `challenges`.
- Progress is **recomputed from `stamps` after each insert**, not incremented. This
  is deliberate — an incremented counter can drift out of sync with reality; a
  recomputed `count(distinct reserve_id)` query can't. Start app-side (check active
  challenges, run the query, write the result) for easy debugging during the
  vibe-coding phase; move to a Postgres trigger later if you want it bulletproof
  against future code paths (e.g. an admin tool) that also insert stamps.

## Friend invites
- Short invite code → redeemed via a `security definer` Postgres function
  (`redeem_invite`), not a raw client insert — the function is the single trusted
  path that validates the code and writes the friendship row, so RLS on
  `friendships` can stay strict without blocking legitimate redemption.
- `friendships` uses `check (user_a < user_b)` to force one canonical row per pair —
  don't "fix" this into allowing both directions, it's intentional.

## Build order (do NOT build this as one prompt — one feature per session/commit)
1. **App shell with dummy data.** Navigation: passport grid view, reserve detail,
   capture flow. Get something tappable before touching Supabase at all.
2. **Supabase auth + schema.** Anonymous sign-in, swap dummy data for real
   reads/writes.
3. **Camera + upload flow, built and tested in isolation.** This is the fiddliest
   part — permissions, image compression before upload, offline handling (reserves
   often have poor signal).
4. **Passport UI** — grid of reserves, filled stamp vs. empty outline, tap through
   to write-up.
5. **Polish** — offline queueing (photo taken with no signal, uploads when back in
   range), challenges UI, friend invite flow, map view.

## Working with the developer
- Experienced in Unity and Salesforce, **new to this stack** (Node/npm, React Native,
  Expo, Supabase). Always give numbered, click-by-click steps for anything they do by
  hand, say what success looks like, and explain new terms the first time. Unity /
  Salesforce analogies are welcome (e.g. RLS ≈ sharing rules).
- Windows + PowerShell: PowerShell blocks `npm.ps1`, so give `npm.cmd` / `npx.cmd`.
- Run the app: `npm.cmd start` in the repo folder (defaults to Expo Go), then scan the
  QR code **from inside the Expo Go app** (Android camera does a web search instead).

## Working with Claude Code
- Feature-by-feature as above, not "build the whole app" in one shot — each as its
  own reviewable session.
- Schema is already decided (see `schema.sql`) — don't let it get reinvented
  mid-session; point Claude Code at the file directly.
- Seed data generation (scraping/compiling the reserves list) is a good isolated
  task to hand off on its own.
- Testing is via Expo Go on your own phone — have it run the dev server and check
  terminal output rather than guessing whether something built.

## Open decisions not yet made
- None blocking the build — folder structure and schema below are ready to start
  from. Revisit UI/UX details (map view, badge design for completed challenges) once
  the core loop (stamp a reserve, see it in your passport) is working end to end.
- **Visual metaphor:** an old-school coffee loyalty card — mobile-first grid, empty
  slots waiting to be stamped. Full visual design comes later (possibly via Claude
  Design), so keep styling in `src/constants/theme.ts` and small components.
- **Possible future feature: road trips.** May eventually need a landing/home screen
  choosing between Passport and Road trips. Not built yet — `/` just redirects to
  `/passport`, so a landing page can replace that redirect later without moving
  any routes. Requirements to be fleshed out iteratively.

## Folder structure
Expo SDK 57 template: app code lives under `src/` (the `@/` import alias points there).
No tab bar yet (one main screen) — `passport.tsx` moves into a `(tabs)/` group when
the map or road trips arrive; groups don't change route URLs, so links stay valid.
```
repo/
├── src/
│   ├── app/                  # expo-router screens
│   │   ├── index.tsx         # redirects to /passport (future landing page)
│   │   ├── passport.tsx      # grid of reserves, stamped/unstamped
│   │   ├── reserve/[id].tsx  # reserve detail + write-up
│   │   └── capture.tsx       # camera flow
│   ├── lib/
│   │   ├── passport-store.tsx # usePassport() — all screens read/write through this
│   │   ├── types.ts          # row types mirroring schema.sql (snake_case)
│   │   ├── supabase.ts       # client init (session persisted via expo-sqlite localStorage)
│   │   └── auth.ts           # anonymous sign-in (+ email upgrade, later)
│   └── components/
│       ├── StampCard.tsx
│       └── CameraCapture.tsx # Step 3
├── data/
│   └── reserves.json         # seed data: SANParks/CapeNature list
├── schema.sql                # full DB schema + RLS, source of truth
├── supabase/
│   └── seed-dev-reserves.sql # 15 placeholder reserves for development
└── assets/
```

## Environment
- Test device: **Android** phone via Expo Go.
- Supabase keys go in `.env.local` (git-ignored) as `EXPO_PUBLIC_SUPABASE_URL` /
  `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Only ever the publishable (anon) key — never service_role.
- Expo-specific working rules (use `npx expo install`, check versioned docs): @AGENTS.md
