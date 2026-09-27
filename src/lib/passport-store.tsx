// Single source of passport data for every screen. Step 1 keeps it in memory
// (resets when the app reloads); Step 2 swaps the internals for Supabase while
// keeping this same hook API, so screens don't need to change.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { DUMMY_RESERVES, DUMMY_STAMPS, DUMMY_USER_ID } from './dummy-data';
import type { Reserve, Stamp } from './types';

type NewStamp = { reserveId: string; writeUp: string | null };

type PassportContextValue = {
  reserves: Reserve[];
  stamps: Stamp[];
  getReserve: (id: string) => Reserve | undefined;
  /** Visits to one reserve, newest first. */
  stampsFor: (reserveId: string) => Stamp[];
  addStamp: (stamp: NewStamp) => void;
};

const PassportContext = createContext<PassportContextValue | null>(null);

export function PassportProvider({ children }: { children: ReactNode }) {
  const [stamps, setStamps] = useState<Stamp[]>(DUMMY_STAMPS);
  const reserves = DUMMY_RESERVES;

  const value = useMemo<PassportContextValue>(
    () => ({
      reserves,
      stamps,
      getReserve: (id) => reserves.find((r) => r.id === id),
      stampsFor: (reserveId) =>
        stamps
          .filter((s) => s.reserve_id === reserveId)
          .sort((a, b) => b.visited_at.localeCompare(a.visited_at)),
      addStamp: ({ reserveId, writeUp }) =>
        setStamps((prev) => [
          ...prev,
          {
            id: `local-${Date.now()}`,
            user_id: DUMMY_USER_ID,
            reserve_id: reserveId,
            photo_url: '', // real photo arrives in Step 3
            write_up: writeUp,
            visited_at: new Date().toISOString(),
            capture_lat: null,
            capture_lng: null,
            is_public: false,
          },
        ]),
    }),
    [reserves, stamps],
  );

  return <PassportContext.Provider value={value}>{children}</PassportContext.Provider>;
}

export function usePassport() {
  const ctx = useContext(PassportContext);
  if (!ctx) throw new Error('usePassport must be used inside <PassportProvider>');
  return ctx;
}
