// Single source of passport data for every screen. Screens only use
// usePassport(); where the data comes from (Supabase since Step 2) stays in here.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { ensureSignedIn } from './auth';
import { supabase } from './supabase';
import type { Reserve, Stamp } from './types';

type NewStamp = { reserveId: string; writeUp: string | null };
type Status = 'loading' | 'ready' | 'error';

type PassportContextValue = {
  status: Status;
  error: string | null;
  retry: () => void;
  reserves: Reserve[];
  stamps: Stamp[];
  getReserve: (id: string) => Reserve | undefined;
  /** Visits to one reserve, newest first. */
  stampsFor: (reserveId: string) => Stamp[];
  /** Saves to Supabase; throws if the save fails so the caller can tell the user. */
  addStamp: (stamp: NewStamp) => Promise<void>;
};

const PassportContext = createContext<PassportContextValue | null>(null);

function messageOf(e: unknown) {
  return e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : String(e);
}

/** Signs in (anonymously if needed) and fetches everything the passport shows. */
async function loadPassport() {
  const userId = await ensureSignedIn();
  const [reservesRes, stampsRes] = await Promise.all([
    supabase.from('reserves').select('*').order('name'),
    // Filter by user explicitly: RLS also lets us read OTHER people's public
    // stamps, which don't belong in my passport.
    supabase.from('stamps').select('*').eq('user_id', userId),
  ]);
  if (reservesRes.error) throw reservesRes.error;
  if (stampsRes.error) throw stampsRes.error;
  return {
    userId,
    reserves: reservesRes.data as Reserve[],
    stamps: stampsRes.data as Stamp[],
  };
}

export function PassportProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [reserves, setReserves] = useState<Reserve[]>([]);
  const [stamps, setStamps] = useState<Stamp[]>([]);

  const load = useCallback((isCancelled: () => boolean = () => false) => {
    loadPassport().then(
      (data) => {
        if (isCancelled()) return;
        setUserId(data.userId);
        setReserves(data.reserves);
        setStamps(data.stamps);
        setStatus('ready');
      },
      (e) => {
        if (isCancelled()) return;
        setError(messageOf(e));
        setStatus('error');
      },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  const retry = useCallback(() => {
    setStatus('loading');
    setError(null);
    load();
  }, [load]);

  const addStamp = useCallback(
    async ({ reserveId, writeUp }: NewStamp) => {
      if (!userId) throw new Error('Not signed in yet');
      const { data, error: insertError } = await supabase
        .from('stamps')
        .insert({
          user_id: userId,
          reserve_id: reserveId,
          photo_url: '', // real photo upload arrives in Step 3
          write_up: writeUp,
        })
        .select()
        .single();
      if (insertError) throw new Error(insertError.message);
      setStamps((prev) => [...prev, data as Stamp]);
      // TODO(Step 5): recompute challenge_progress here (see schema.sql notes).
    },
    [userId],
  );

  const value = useMemo<PassportContextValue>(
    () => ({
      status,
      error,
      retry,
      reserves,
      stamps,
      getReserve: (id) => reserves.find((r) => r.id === id),
      stampsFor: (reserveId) =>
        stamps
          .filter((s) => s.reserve_id === reserveId)
          .sort((a, b) => b.visited_at.localeCompare(a.visited_at)),
      addStamp,
    }),
    [status, error, retry, reserves, stamps, addStamp],
  );

  return <PassportContext.Provider value={value}>{children}</PassportContext.Provider>;
}

export function usePassport() {
  const ctx = useContext(PassportContext);
  if (!ctx) throw new Error('usePassport must be used inside <PassportProvider>');
  return ctx;
}
