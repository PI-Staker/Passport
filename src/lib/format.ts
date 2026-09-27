export function formatVisitDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const FILLER_WORDS = new Set(['national', 'park', 'nature', 'reserve', 'area', 'wilderness']);

/** Short label printed inside a stamp, e.g. "Kruger National Park" → "KRUGER". */
export function stampLabel(name: string) {
  const words = name.split(/[\s-]+/).filter((w) => !FILLER_WORDS.has(w.toLowerCase()));
  const label = (words.length ? words : [name]).slice(0, 2).join(' ');
  return label.toUpperCase();
}
