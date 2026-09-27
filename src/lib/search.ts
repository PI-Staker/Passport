// Typo-tolerant search over reserves. Every word the user types must match some
// word of the reserve (name incl. old names, organisation, province) by:
//   prefix ("kru" → Kruger), substring ("merensky"), or a small edit distance
//   ("tsitsikama" → Tsitsikamma, "kruegr" → Kruger).
// Deliberately simple — a few hundred reserves don't need a search library.
import type { Reserve } from './types';

export function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents
    .replace(/ǀ/g, '') // click letter in ǀAi-ǀAis
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function words(text: string) {
  return normalize(text).split(' ').filter(Boolean);
}

/** Damerau-Levenshtein (optimal string alignment) distance, capped for speed. */
function editDistance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

function tokenMatches(token: string, word: string) {
  if (word.startsWith(token)) return true;
  if (token.length >= 3 && word.includes(token)) return true;
  // Typo tolerance only for longer words, and the first letter must be right —
  // otherwise "western" matches "eastern".
  if (token.length < 4 || token[0] !== word[0]) return false;
  const allowed = token.length >= 8 ? 2 : 1;
  // Compare against the whole word and against a same-length prefix, so typos
  // work while the user is still typing ("tsitsik" vs "tsitsikamma").
  return (
    editDistance(token, word, allowed) <= allowed ||
    editDistance(token, word.slice(0, token.length), allowed) <= allowed
  );
}

export type SearchIndex = Map<string, string[]>;

export function buildSearchIndex(reserves: Reserve[]): SearchIndex {
  const index: SearchIndex = new Map();
  for (const r of reserves) {
    const w = words([r.name, r.org ?? '', r.province ?? ''].join(' '));
    // Also index adjacent word pairs joined, so "dehoop" finds "De Hoop".
    const joined = w.slice(1).map((word, i) => w[i] + word);
    index.set(r.id, [...w, ...joined]);
  }
  return index;
}

/** True if the reserve matches the query (empty query matches everything). */
export function matchesQuery(index: SearchIndex, reserveId: string, query: string) {
  const tokens = words(query);
  if (tokens.length === 0) return true;
  const haystack = index.get(reserveId) ?? [];
  return tokens.every((t) => haystack.some((w) => tokenMatches(t, w)));
}
