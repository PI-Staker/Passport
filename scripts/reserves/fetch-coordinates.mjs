// Fills in lat/lng for data/reserves.json from Wikidata, matched by name.
//
//   node scripts/reserves/fetch-coordinates.mjs          # only fills missing coords
//   node scripts/reserves/fetch-coordinates.mjs --force  # re-matches everything
//
// Entries can set "wikidata_name" when Wikidata uses a different label, or set
// "lat"/"lng" by hand plus "coord_locked": true (or a "coord_note") so --force
// never overwrites them.
// Coordinates are approximate (usually the reserve's centre, not the gate) —
// good enough for a map view.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FILE = fileURLToPath(new URL('../../data/reserves.json', import.meta.url));
const force = process.argv.includes('--force');

// Every protected area in South Africa with coordinates, plus a few non-protected-area
// items (e.g. Drakensberg peaks) that share a name with a reserve section.
const QUERY = `
SELECT ?item ?label ?coord ?kind WHERE {
  ?item wdt:P17 wd:Q258 ; wdt:P625 ?coord ; rdfs:label ?label .
  FILTER(LANG(?label) = "en")
  { ?item wdt:P31/wdt:P279* wd:Q473972 . BIND("protected" AS ?kind) }
  UNION { ?item wdt:P31 wd:Q8502 . BIND("mountain" AS ?kind) }
  UNION { ?item wdt:P31 wd:Q4421 . BIND("forest" AS ?kind) }
}`;

const SA_BOUNDS = { minLat: -35.5, maxLat: -22, minLng: 16, maxLng: 33.5 };

// Rough province bounding boxes [minLat, maxLat, minLng, maxLng]. A match must
// fall inside its reserve's province (plus a margin — big parks' centres can sit
// over the border), which weeds out same-named farms/peaks elsewhere.
const PROVINCE_BOX = {
  'Western Cape': [-34.9, -30.4, 17.7, 24.3],
  'Northern Cape': [-32.9, -24.7, 16.4, 25.6],
  'Eastern Cape': [-34.3, -30.0, 22.6, 30.2],
  'Free State': [-30.8, -26.6, 24.3, 29.8],
  'KwaZulu-Natal': [-31.2, -26.8, 28.8, 33.0],
  Gauteng: [-26.9, -25.1, 27.1, 29.0],
  'North West': [-28.0, -24.6, 22.6, 28.4],
  Limpopo: [-25.4, -22.1, 26.4, 31.9],
  Mpumalanga: [-27.4, -24.3, 28.2, 32.1],
};
const MARGIN = 0.5; // degrees (~50 km)

function inProvince({ lat, lng }, province) {
  const box = PROVINCE_BOX[province];
  if (!box) return true;
  const [minLat, maxLat, minLng, maxLng] = box;
  return (
    lat >= minLat - MARGIN && lat <= maxLat + MARGIN && lng >= minLng - MARGIN && lng <= maxLng + MARGIN
  );
}

const GENERIC = [
  'nature reserve', 'national park', 'game reserve', 'provincial park', 'wilderness area',
  'bird sanctuary', 'transfrontier park', 'mountain reserve', 'forest', 'reserve', 'park', 'dam',
];

function normalize(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ǀ|]/g, '')
    .replace(/[–—]/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function core(s) {
  let n = normalize(s).replace(/-/g, ' ');
  for (const g of GENERIC) n = n.replace(new RegExp(`\\b${g}\\b`, 'g'), ' ');
  return n.replace(/\s+/g, ' ').trim();
}

function parsePoint(wkt) {
  const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(wkt);
  return m ? { lng: Number(m[1]), lat: Number(m[2]) } : null;
}

const inSA = ({ lat, lng }) =>
  lat >= SA_BOUNDS.minLat && lat <= SA_BOUNDS.maxLat && lng >= SA_BOUNDS.minLng && lng <= SA_BOUNDS.maxLng;

const res = await fetch(
  'https://query.wikidata.org/sparql?query=' + encodeURIComponent(QUERY),
  {
    headers: {
      Accept: 'application/sparql-results+json',
      'User-Agent': 'ReservePassport/0.1 (seed data script)',
    },
  },
);
if (!res.ok) throw new Error(`Wikidata query failed: ${res.status}`);
const rows = (await res.json()).results.bindings;

const byExact = new Map();
const byCore = new Map();
for (const r of rows) {
  const point = parsePoint(r.coord.value);
  if (!point || !inSA(point)) continue;
  const entry = { id: r.item.value.split('/').pop(), label: r.label.value, ...point };
  const add = (map, key) => {
    if (!key) return;
    const list = map.get(key) ?? [];
    if (!list.some((e) => e.id === entry.id)) list.push(entry);
    map.set(key, list);
  };
  add(byExact, normalize(entry.label));
  // Loose matching only against actual protected areas — otherwise "Boskop Dam
  // Nature Reserve" happily matches some mountain called Boskop.
  if (r.kind.value === 'protected') add(byCore, core(entry.label));
}

const data = JSON.parse(readFileSync(FILE, 'utf8'));
const report = { matched: 0, kept: 0, ambiguous: [], missing: [] };

for (const reserve of data.reserves) {
  // Hand-set locations (marked with coord_note or coord_locked) survive --force.
  const locked = reserve.coord_locked || reserve.coord_note;
  if ((!force || locked) && typeof reserve.lat === 'number' && typeof reserve.lng === 'number') {
    report.kept++;
    continue;
  }
  // Start clean so a previous (possibly wrong) match never lingers.
  delete reserve.lat;
  delete reserve.lng;
  delete reserve.wikidata;
  const wanted = reserve.wikidata_name ?? reserve.name;
  const here = (list) => (list ?? []).filter((c) => inProvince(c, reserve.province));
  let candidates = here(byExact.get(normalize(wanted)));
  if (candidates.length === 0) candidates = here(byCore.get(core(wanted)));

  if (candidates.length === 1) {
    const [c] = candidates;
    reserve.lat = Math.round(c.lat * 1e5) / 1e5;
    reserve.lng = Math.round(c.lng * 1e5) / 1e5;
    reserve.wikidata = c.id;
    report.matched++;
  } else if (candidates.length > 1) {
    report.ambiguous.push(`${reserve.name}  →  ${candidates.map((c) => `${c.label} (${c.id})`).join(', ')}`);
  } else {
    report.missing.push(reserve.name);
  }
}

writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');

console.log(`Wikidata items considered: ${rows.length}`);
console.log(`Matched: ${report.matched}   Kept existing: ${report.kept}`);
console.log(`\nAmbiguous (${report.ambiguous.length}) — set "wikidata_name" or lat/lng by hand:`);
for (const a of report.ambiguous) console.log('  ' + a);
console.log(`\nNo match (${report.missing.length}) — set "wikidata_name" or lat/lng by hand:`);
for (const m of report.missing) console.log('  ' + m);
