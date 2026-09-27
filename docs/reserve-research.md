# Reserve research & weekly status pass

How the reserve list in `data/reserves.json` is researched and kept current.
Written from the first full pass (2026-09-27) — what worked, what didn't, and
the checklist for repeating it. Anyone (human or Claude) running a pass should
follow this and update it when a source changes.

## What we're tracking

For every reserve in `data/reserves.json`:

| Field | Meaning |
|---|---|
| `status` | `open` · `limited` · `closed` · `unknown` (see below). Absent = not checked yet. |
| `status_note` | One line of context a visitor would care about ("Day visitors must book", "Closed after fire — reopening March"). |
| `sources` | URLs that support the status. Prefer official ones. |
| `checked` | Date of the last check (`YYYY-MM-DD`). |
| `check` | A **decision for the product owner**, not a research task (e.g. "lodge-only — include?"). Remove once decided. |

Reserves removed from the passport go to `excluded` with a `reason`, `sources`
and `checked` date, so a later pass can see why and re-check if things change.

### Status definitions

- **open** — the public can drive/walk in (possibly paying a conservation fee).
- **limited** — visitable, but with a restriction a visitor must know about:
  booking required, lodge guests only, permit required, weekends only.
- **closed** — temporarily closed (fire, flood, repairs, unrest). Stays in the
  passport; add the reason and expected reopening if known.
- **unknown** — exists, but no trustworthy current information. Includes
  "reported abandoned" when the only source is political or anecdotal.
- **excluded** (moved to `excluded`) — not open to the public at all, not a
  separate reserve, or out of scope (private, municipal, marine-only).

## Rules

- **Scope:** government-run (national + provincial) reserves open to visitors.
  No private reserves, municipal reserves, or marine-only protected areas.
- **Province:** where the **main gate** is (Kruger → Mpumalanga).
- **Big parks are split into their separately gated sections** (Garden Route,
  Drakensberg, iSimangaliso, Table Mountain). The test: *you can't say you've
  been to Cathedral Peak because you were at Monk's Cowl.*
- **Names:** current official name first, old name in brackets —
  `Goegap Nature Reserve (Hester Malan)`. Only when the *reserve itself* was
  renamed: Chelmsford's dam became Ntshingwayo Dam, but Ezemvelo still calls the
  reserve "Chelmsford Nature Reserve", so it stays.
- **Renaming an existing reserve:** set `"wikidata_name"` to the old name if the
  map lookup relied on it. Stamps are linked by id, not name, so renames are safe
  — but the seed matches rows by name, so rename in the database first (see
  "Applying changes").

## Sources — what works

Ranked by trust. "Readable" = the research tools could actually read it in 2026-09.

| Source | Covers | Readable? | Notes |
|---|---|---|---|
| [CapeNature reserves](https://www.capenature.co.za/reserves) | Western Cape | ✅ | Clean official list. |
| [CapeNature news](https://www.capenature.co.za/news) | Western Cape status | ✅ | **Best status source found** — dated notices of closures/fires/access changes. Check every pass. |
| [MTPA provincial parks](https://www.mpumalanga.com/our-provincial-parks) | Mpumalanga | ✅ | Official list by district. No open/closed info — reservations@mtpa.co.za. |
| [Limpopo Wildlife Resorts](https://www.lwr.gov.za/) | Limpopo | ✅ | Official booking site; lists only reserves with bookable facilities. |
| [NW Parks honorary officers](https://ho.org.za/parks/) | North West | ✅ | Marks each park open / "not open to the public" / "not open to day visitors". Very useful. |
| [DESTEA resorts & reserves](https://www.destea.gov.za/?page_id=3774) | Free State | ⚠️ flaky | Connection often drops — retry, or use the search-result summary. |
| [Ezemvelo protected areas (Wikipedia)](https://en.wikipedia.org/wiki/List_of_Ezemvelo_KZN_Wildlife_Protected_Areas) | KwaZulu-Natal | ✅ | Best KZN list, with coordinates. Secondary source. |
| [List of protected areas of SA (Wikipedia)](https://en.wikipedia.org/wiki/List_of_protected_areas_of_South_Africa) | All | ✅ (raw wikitext) | Good skeleton, partly outdated (e.g. still lists Tsitsikamma as its own park). |
| Wikidata SPARQL | Coordinates | ✅ | Used by `fetch-coordinates.mjs`. Poor on "who manages it". |
| gauteng.net, visiteasterncape.co.za | Gauteng, EC | ✅ | Provincial tourism sites; confirm existence, rarely status. |
| sa-venues.com, wheretostay.co.za, tripadvisor | Anything | ✅ | **Last resort.** Often years out of date. Tripadvisor reviews are useful for "neglected / closed" signals. |

### What doesn't work (don't waste time)

- **sanparks.org** — returns 403 to automated tools. Use search results or the
  Wikipedia list for SANParks; SANParks status changes need a human or search.
- **kznwildlife.com** — park list is rendered by JavaScript; not readable.
  Individual park pages sometimes are (e.g. Chelmsford).
- **Facebook** — login wall; only the page title comes through. Posts *do*
  sometimes appear in **web search results** (that's how Leeuwfontein was
  confirmed via GDARD's page) — search `"<reserve name>" site:facebook.com`.
- **X/Twitter** — blocked (402).
- **Instagram** — not tried; assume login wall like Facebook.
- **Gauteng GTAC nature reserves report (PDF)** — about funding across
  provinces; doesn't name Gauteng's reserves.

Social media is where agencies post closures first (CapeNature especially). Since
it can't be read directly, a human glancing at the main agencies' Facebook pages
during the weekly pass adds real value — see checklist.

## Weekly status pass — checklist

Time budget: ~30–45 minutes with Claude doing the searching.

1. **Official news/status pages** — read each, note anything affecting a reserve:
   - CapeNature news (link above)
   - SANParks: web search `SANParks closure OR closed OR "temporarily closed" <this month>`
   - Ezemvelo: web search `Ezemvelo KZN Wildlife closed OR closure <this month>`
   - Search `nature reserve closed <province> <this month>` for each province.
2. **Social media (human, 5 min)** — skim the latest posts on the Facebook pages
   of CapeNature, SANParks, Ezemvelo, ECPTA, MTPA, North West Parks. Note any
   closures/reopenings and paste them to Claude.
3. **Stale entries** — every reserve whose `checked` date is older than 90 days,
   or `status` is `unknown`/absent: search `"<name>" open OR closed <year>` and
   check its sources. Work through them oldest first; ~15 per pass is fine.
4. **Update `data/reserves.json`** — set `status`, `status_note`, `sources`,
   `checked` for everything looked at (even if unchanged — bump `checked`).
   New reserves → add; gone → move to `excluded` with a reason.
5. **Rebuild and review:**
   `node scripts/reserves/build.mjs` → look over `data/reserves-review.csv`.
6. **Commit** with a message summarising what changed ("Status pass 2026-10-04:
   De Hoop closed (fire), 12 re-checked").
7. **Apply to the database** (see below) if anything visible to users changed.

## Applying changes to Supabase

1. `node scripts/reserves/fetch-coordinates.mjs` (only needed if reserves were
   added — fills in map locations; hand-set ones are never overwritten).
2. `node scripts/reserves/build.mjs`
3. Copy `supabase/seed-reserves.sql` into Supabase → SQL Editor → Run.
   It adds new reserves, updates existing ones by name, and deletes reserves no
   longer listed **unless someone has stamped them** — those are listed at the
   end of the run for manual handling.

Note: status isn't in the database yet — it lives in `reserves.json` only. When
the app starts showing status, the seed will need `status` / `status_note`
columns (planned).

## Pass log

| Date | Who | Summary |
|---|---|---|
| 2026-09-27 | Claude (first pass) | Built list from official + Wikipedia sources; researched 68 flagged entries. 90 open, 3 limited, 7 unknown, 83 not yet checked (mostly well-known SANParks/Ezemvelo parks). Excluded 5: Groenkloof NP (no visitors), SA Lombard (not public), Great Kei (not a separate reserve), Mdala & Marico Bosveld (not on agency lists). Added Rust de Winter Dam, Makuya. |

## Candidates not yet added

Found during research, not yet assessed — check scope/access before adding:

- **KZN (Ezemvelo list):** Isandlwana (battlefield heritage site), Enseleni, Impendle, Karkloof, Mount Currie, Moor Park, Hlathikhulu Forest, Entumeni Forest, Sileza, Ncandu, Blinkwater, Umhlanga Lagoon, Skyline, Bluff, North Park, Himeville, uMngeni Vlei, Bulwer Forest.
- **KZN (Msinsi):** Inanda Dam, Nagle Dam, Shongweni Dam — only if Msinsi is in scope.
- **iSimangaliso:** Maphelane, Charters Creek, Ozabeni — currently not separate stamps.
