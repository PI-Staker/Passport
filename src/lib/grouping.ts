// Turns the reserve list into passport sections based on the user's
// "Group by" / "Show" choices. Pure functions — no UI, no data fetching.
import type { Reserve } from './types';

export const PROVINCES = [
  'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo',
  'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape',
] as const;

export type GroupBy = 'province' | 'org' | 'none';
export type ShowFilter = 'all' | 'stamped' | 'unstamped';

export const GROUP_BY_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'province', label: 'Province' },
  { value: 'org', label: 'Organisation' },
  { value: 'none', label: 'A–Z' },
];

export const SHOW_OPTIONS: { value: ShowFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'stamped', label: 'Stamped' },
  { value: 'unstamped', label: 'Not yet' },
];

export type ReserveSection = {
  key: string;
  /** null = no heading (used for A–Z) */
  title: string | null;
  reserves: Reserve[];
  /** Progress within the group, counted before the Show filter is applied. */
  stampedCount: number;
  totalCount: number;
};

const OTHER = 'Other';

function groupKey(reserve: Reserve, groupBy: GroupBy) {
  if (groupBy === 'province') return reserve.province || OTHER;
  if (groupBy === 'org') return reserve.org || OTHER;
  return 'all';
}

export function buildSections(
  reserves: Reserve[],
  isStamped: (reserveId: string) => boolean,
  groupBy: GroupBy,
  show: ShowFilter,
  /** Extra filter (search, province). Group progress still counts every reserve in the group. */
  include: (reserve: Reserve) => boolean = () => true,
): ReserveSection[] {
  const groups = new Map<string, Reserve[]>();
  for (const r of reserves) {
    const key = groupKey(r, groupBy);
    const list = groups.get(key);
    if (list) list.push(r);
    else groups.set(key, [r]);
  }

  const keep = (r: Reserve) =>
    include(r) && (show === 'all' || (show === 'stamped' ? isStamped(r.id) : !isStamped(r.id)));

  return [...groups.entries()]
    .sort(([a], [b]) => (a === OTHER ? 1 : b === OTHER ? -1 : a.localeCompare(b)))
    .map(([key, list]) => {
      const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));
      return {
        key,
        title: groupBy === 'none' ? null : key,
        reserves: sorted.filter(keep),
        stampedCount: sorted.filter((r) => isStamped(r.id)).length,
        totalCount: sorted.length,
      };
    })
    .filter((section) => section.reserves.length > 0);
}

/** Splits a list into rows of `size` for grid rendering inside a SectionList. */
export function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}
