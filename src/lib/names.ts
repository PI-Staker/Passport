// Reserve names carry extra information by convention (see docs/reserve-research.md):
//   "Goegap Nature Reserve (Hester Malan)"          → old name / alias in brackets
//   "Garden Route National Park – Tsitsikamma"      → park – section
// These helpers split that apart for display; search still uses the full name.

export type ReserveNames = {
  /** Name exactly as stored. */
  full: string;
  /** Current name without the bracketed alias. Use for headings. */
  display: string;
  /** Bracketed old name / alias, if any ("Hester Malan"). */
  alias: string | null;
  /** For split parks: the park ("Garden Route National Park"). */
  park: string | null;
  /** For split parks: the section ("Tsitsikamma"). */
  section: string | null;
  /** Shortest recognisable label, for small tiles. */
  tile: string;
};

const ALIAS = /^(.*?)\s*\(([^)]+)\)\s*$/;
const SECTION_SEPARATOR = ' – ';

export function reserveNames(full: string): ReserveNames {
  const aliasMatch = ALIAS.exec(full);
  const display = aliasMatch ? aliasMatch[1] : full;
  const alias = aliasMatch ? aliasMatch[2] : null;

  const sep = display.indexOf(SECTION_SEPARATOR);
  const park = sep >= 0 ? display.slice(0, sep) : null;
  const section = sep >= 0 ? display.slice(sep + SECTION_SEPARATOR.length) : null;

  return { full, display, alias, park, section, tile: section ?? display };
}
