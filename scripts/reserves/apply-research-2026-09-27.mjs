// One-off: applies the findings of the 2026-09-27 research pass to
// data/reserves.json. Kept in the repo as a record of what changed and why.
// (Future passes should edit data/reserves.json directly — see
// docs/reserve-research.md.)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FILE = fileURLToPath(new URL('../../data/reserves.json', import.meta.url));
const data = JSON.parse(readFileSync(FILE, 'utf8'));
const CHECKED = '2026-09-27';
data.excluded ??= [];

const find = (name) => {
  const r = data.reserves.find((x) => x.name === name);
  if (!r) throw new Error(`Not found: ${name}`);
  return r;
};

function exclude(name, reason, sources) {
  const i = data.reserves.findIndex((x) => x.name === name);
  if (i < 0) throw new Error(`Not found: ${name}`);
  const [r] = data.reserves.splice(i, 1);
  data.excluded.push({ name: r.name, org: r.org, province: r.province, reason, sources, checked: CHECKED });
}

function status(name, value, note, sources) {
  const r = find(name);
  r.status = value;
  if (note) r.status_note = note;
  else delete r.status_note;
  r.sources = sources;
  r.checked = CHECKED;
  delete r.check;
}

function rename(oldName, newName) {
  const r = find(oldName);
  r.wikidata_name ??= oldName;
  r.name = newName;
}

const S = {
  capenature: 'https://www.capenature.co.za/reserves',
  mtpa: 'https://www.mpumalanga.com/our-provincial-parks',
  lwr: 'https://www.lwr.gov.za/',
  nwp: 'https://ho.org.za/parks/',
  destea: 'https://www.destea.gov.za/?page_id=3774',
  ezemveloList: 'https://en.wikipedia.org/wiki/List_of_Ezemvelo_KZN_Wildlife_Protected_Areas',
  msinsi: 'https://msinsi.co.za/nature-based-tourism/msinsi-albert-falls-dam/',
  daLimpopo: 'https://limpopo.da.org.za/2025/11/da-demands-accountability-and-reform-as-limpopos-nature-reserves-collapse-under-mismanagement',
};

// ---- Decisions: split big parks into separately gated sections -------------
for (const r of data.reserves) {
  if (r.check && /split|section split/i.test(r.check)) delete r.check;
}
const tmnpIndex = data.reserves.findIndex((r) => r.name === 'Table Mountain National Park');
const tmnp = data.reserves[tmnpIndex];
data.reserves.splice(
  tmnpIndex,
  1,
  { ...tmnp, name: 'Table Mountain National Park – Table Mountain', note: 'No single gate — photograph the park sign at the Lower Cableway or a main trailhead', check: undefined },
  { name: 'Table Mountain National Park – Cape of Good Hope (Cape Point)', org: 'SANParks', province: 'Western Cape', lat: -34.3568, lng: 18.4740, coord_locked: true, coord_note: 'approximate, Cape Point' },
  { name: 'Table Mountain National Park – Boulders Beach', org: 'SANParks', province: 'Western Cape', lat: -34.1975, lng: 18.4510, coord_locked: true, coord_note: 'approximate, Boulders Beach' },
  { name: 'Table Mountain National Park – Silvermine', org: 'SANParks', province: 'Western Cape', lat: -34.0833, lng: 18.4250, coord_locked: true, coord_note: 'approximate, Silvermine reservoir' },
);
delete data.reserves.find((r) => r.name === 'Table Mountain National Park – Table Mountain').check;

// ---- Official lists: confirmed open ---------------------------------------
for (const r of data.reserves.filter((x) => x.org === 'CapeNature')) {
  r.status = 'open'; r.sources = [S.capenature]; r.checked = CHECKED;
}
for (const n of ['Blyde River Canyon Nature Reserve', 'Loskop Dam Nature Reserve', 'Songimvelo Game Reserve', 'Barberton Nature Reserve', 'Mabusa Nature Reserve', 'Mkhombo Nature Reserve', 'SS Skosana Nature Reserve', 'Nooitgedacht Dam Nature Reserve', 'Ohrigstad Dam Nature Reserve', 'Andover Nature Reserve']) {
  status(n, 'open', null, [S.mtpa]);
}
rename('Mahushe Shongwe Game Reserve', 'Mahushe Shongwe Nature Reserve');
status('Mahushe Shongwe Nature Reserve', 'open', null, [S.mtpa]);
rename('Mthethomusha Game Reserve', 'Mthethomusha Nature Reserve');
status('Mthethomusha Nature Reserve', 'open', null, [S.mtpa]);
rename('Manyeleti Game Reserve', 'Manyeleti Nature Reserve');
status('Manyeleti Nature Reserve', 'limited', 'Visited via the lodges inside the reserve', [S.mtpa]);
find('Manyeleti Nature Reserve').check = 'Lodge-guests-only reserve — include? (same question as Madikwe)';

for (const n of ['Doorndraai Dam Nature Reserve', 'Nylsvley Nature Reserve', "D'Nyala Nature Reserve", 'Mokolo Dam Nature Reserve', 'Nwanedi Nature Reserve', 'Lekgalameetse Nature Reserve', 'Schuinsdraai Nature Reserve', 'Blouberg Nature Reserve']) {
  status(n, 'open', null, [S.lwr]);
}
rename('Wolkberg Wilderness Area', 'Wolkberg Nature Reserve');
status('Wolkberg Nature Reserve', 'open', null, [S.lwr]);
data.reserves.push(
  { name: 'Rust de Winter Dam Nature Reserve', org: 'Limpopo Provincial Parks', province: 'Limpopo', status: 'open', sources: [S.lwr], checked: CHECKED, note: 'Added from the Limpopo Wildlife Resorts list' },
  { name: 'Makuya Nature Reserve', org: 'Limpopo Provincial Parks', province: 'Limpopo', status: 'open', sources: [S.lwr], checked: CHECKED, note: 'Added from the Limpopo Wildlife Resorts list (listed as "Makuya (Singo)")' },
);

for (const n of ['Barberspan Bird Sanctuary', 'Bloemhof Dam Nature Reserve', 'Botsalano Game Reserve', 'Kgaswane Mountain Reserve', 'Mafikeng Game Reserve', 'Molemane Eye Nature Reserve', 'Molopo Game Reserve', 'Pilanesberg National Park', 'Vaalkop Dam Nature Reserve', 'Wolwespruit Nature Reserve', 'Boskop Dam Nature Reserve']) {
  status(n, 'open', null, [S.nwp]);
}
rename('Borakalalo National Park', 'Borakalalo Game Reserve');
status('Borakalalo Game Reserve', 'open', null, [S.nwp]);
status('Madikwe Game Reserve', 'limited', 'Not open to day visitors — lodge guests only', [S.nwp]);
find('Madikwe Game Reserve').check = 'Lodge-guests-only reserve — include?';
exclude('SA Lombard Nature Reserve', 'North West Parks lists it as "NOT OPEN TO THE PUBLIC"', [S.nwp]);
exclude('Marico Bosveld Nature Reserve', 'Not on North West Parks\' current list of parks', [S.nwp]);

for (const n of ['Kalkfontein Dam Nature Reserve', 'Erfenis Dam Nature Reserve', 'Koppies Dam Nature Reserve', 'Maria Moroka Nature Reserve', 'Rustfontein Dam Nature Reserve', 'Seekoeivlei Nature Reserve', 'Caledon Nature Reserve']) {
  status(n, 'open', 'Listed by DESTEA as a provincial resort/reserve (page intermittently unreachable)', [S.destea]);
}

// ---- KZN: Ezemvelo protected-areas list -----------------------------------
for (const n of ['Ophathe Game Reserve', 'Phongolo Nature Reserve', 'Rugged Glen Nature Reserve', 'Vergelegen', 'Wagendrift Dam Nature Reserve', 'Coleford Nature Reserve', 'Queen Elizabeth Park Nature Reserve', 'Ongoye Forest Nature Reserve', 'Nkandla Forest Nature Reserve']) {
  status(n, 'open', null, [S.ezemveloList]);
}
status('Chelmsford Dam Nature Reserve', 'open', null, ['https://kznwildlife.com/index.php?Itemid=262&item_id=209&option=com_zoo&task=item']);
rename('Chelmsford Dam Nature Reserve', 'Chelmsford Nature Reserve');
find('Chelmsford Nature Reserve').note = 'Surrounds Ntshingwayo Dam (formerly Chelmsford Dam). Ezemvelo still calls the reserve "Chelmsford".';
for (const n of ['Albert Falls Dam Nature Reserve', 'Hazelmere Dam Nature Reserve']) {
  const r = find(n);
  r.org = 'Msinsi (uMngeni-uThukela Water)';
  status(n, 'open', null, [S.msinsi]);
  r.check = 'Run by Msinsi, a state-owned water utility subsidiary (not a conservation agency) — in scope?';
}
find('Hazelmere Dam Nature Reserve').sources = ['https://msinsi.co.za.dedi314.cpt1.host-h.net/nature-based-tourism/msinsi-hazelmere/'];

// ---- Gauteng / Northern Cape / Eastern Cape --------------------------------
status('Abe Bailey Nature Reserve', 'unknown', 'Exists and provincial; could not confirm current visitor access', ['https://www.gauteng.net/attractions/abe-bailey-nature-reserve/']);
status('Alice Glockner Nature Reserve', 'open', null, ['https://en.wikipedia.org/wiki/Alice_Glockner_Nature_Reserve']);
status('Leeuwfontein Collaborative Nature Reserve', 'open', null, ['https://www.facebook.com/OfficialGDARD/posts/leeuwfontein-provincial-nature-reserve-is-nestled-close-to-hartebeestfontein-pre/1589277807861180/']);
status('Roodeplaat Dam Nature Reserve', 'limited', 'Day visitors must book ahead', ['https://www.gauteng.net/attractions/roodeplaat-dam-nature-reserve/']);
exclude('Groenkloof National Park', 'SANParks head office grounds — no visitors allowed in the park', ['https://www.sanparks.org/wp-content/uploads/2021/03/groenkloof.pdf']);
status('Oorlogskloof Nature Reserve', 'open', null, ['https://en.wikipedia.org/wiki/Oorlogskloof_Nature_Reserve']);
status('Doornkloof Nature Reserve', 'open', null, ['https://www.sa-venues.com/game-reserves/doornkloof.php']);
status('Umtiza Nature Reserve', 'open', null, ['https://visiteasterncape.co.za/news-centre/umtiza-nature-reserve-a-hidden-gem-for-hiking-enthusiasts/']);
exclude('Great Kei Nature Reserve', 'Not a separate reserve — the Great Kei River is the northern boundary of East London Coast Nature Reserve', ['https://www.sa-venues.com/game-reserves/east-london-coast.php']);
status('East London Coast Nature Reserve', 'open', 'Made up of 10 small coastal reserves (Cape Morgan, Double Mouth, Kwelera, Nahoon, Gulu…)', ['https://www.sa-venues.com/game-reserves/east-london-coast.php']);
find('East London Coast Nature Reserve').check = 'One stamp for all 10 coastal reserves, or split like the big parks?';

// ---- Limpopo reserves not on the provincial booking site -------------------
status('Atherstone Nature Reserve', 'open', null, ['https://en.wikipedia.org/wiki/Atherstone_Nature_Reserve']);
rename('Atherstone Nature Reserve', 'Atherstone Collaborative Nature Reserve');
status('Happy Rest Nature Reserve', 'open', null, ['https://www.wheretostay.co.za/topic/5674-happy-rest-nature-reserve']);
status('Langjan Nature Reserve', 'open', 'Day visits only — no overnight accommodation', ['https://www.southafrica.net/gl/en/travel/article/langjan-nature-reserve']);
status('Modjadji Nature Reserve', 'open', 'Open 07:30–16:30; recent reviews report neglect and overgrown trails', ['https://www.tripadvisor.com/Attraction_Review-g3376934-d3336952-Reviews-Modjadji_Nature_Reserve-Duiwelskloof_Limpopo_Province.html']);
status('Hans Merensky Nature Reserve', 'unknown', 'Reported "effectively abandoned" (DA statement, Nov 2025)', [S.daLimpopo]);
status('Letaba Ranch Nature Reserve', 'unknown', 'Reported "effectively abandoned" (DA statement, Nov 2025)', [S.daLimpopo]);
status('Manombe Nature Reserve', 'unknown', 'Exists; no current visitor information found', []);
status('Tzaneen Dam Nature Reserve', 'unknown', 'Exists; no current visitor information found', ['https://www.sa-venues.com/game-reserves/tzaneen-dam.php']);
status('Percy Fyfe Nature Reserve', 'unknown', 'Exists; no current visitor information found', ['https://www.sa-venues.com/game-reserves/percy-fyfe.php']);

// ---- Mpumalanga: not on MTPA's current list --------------------------------
exclude('Mdala Game Reserve', "Not on MTPA's current list of provincial parks", [S.mtpa]);
status('Verloren Vallei Nature Reserve', 'unknown', "Not on MTPA's current visitor list; Ramsar wetland — may be access by arrangement only", [S.mtpa]);

// ---- Old names in brackets (rule: current name first, old name in brackets)
rename('Goegap Nature Reserve', 'Goegap Nature Reserve (Hester Malan)');
rename('Kgaswane Mountain Reserve', 'Kgaswane Mountain Reserve (Rustenburg Nature Reserve)');
rename('Gariep Dam Nature Reserve', 'Gariep Dam Nature Reserve (Hendrik Verwoerd Dam)');

// clean undefined keys introduced by spreads
data.reserves = data.reserves.map((r) => JSON.parse(JSON.stringify(r)));
writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');

const by = (s) => data.reserves.filter((r) => r.status === s).length;
console.log(`reserves: ${data.reserves.length}  excluded: ${data.excluded.length}`);
console.log(`open ${by('open')}  limited ${by('limited')}  unknown ${by('unknown')}  unchecked ${data.reserves.filter((r) => !r.status).length}`);
console.log('still flagged for a decision:');
for (const r of data.reserves.filter((x) => x.check)) console.log(`  - ${r.name}: ${r.check}`);
