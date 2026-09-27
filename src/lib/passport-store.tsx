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
import { deletePhoto, getPhotoUrls, uploadPhoto } from './photos';
import { supabase } from './supabase';
import type { Reserve, Stamp } from './types';

type NewStamp = { reserveId: string; writeUp: string | null; photoUri: string };
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
  /** Viewable URL for a stamp's photo, or undefined if none / not loaded. */
  photoUrlFor: (stamp: Stamp) => string | undefined;
  /** Uploads the photo, then saves the stamp. Throws on failure so the caller can tell the user. */
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
  const stamps = stampsRes.data as Stamp[];
  // Photos are nice-to-have here: if links fail, show placeholders, don't block the passport.
  const photoUrls = await getPhotoUrls(stamps.map((s) => s.photo_url)).catch(() => ({}));
  return {
    userId,
    reserves: reservesRes.data as Reserve[],
    stamps,
    photoUrls,
  };
}

export function PassportProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [reserves, setReserves] = useState<Reserve[]>([]);
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const load = useCallback((isCancelled: () => boolean = () => false) => {
    loadPassport().then(
      (data) => {
        if (isCancelled()) return;
        setUserId(data.userId);
        setReserves(data.reserves);
        setStamps(data.stamps);
        setPhotoUrls(data.photoUrls);
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
    async ({ reserveId, writeUp, photoUri }: NewStamp) => {
      if (!userId) throw new Error('Not signed in yet');
      const photoPath = await uploadPhoto(photoUri, userId);
      const { data, error: insertError } = await supabase
        .from('stamps')
        .insert({
          user_id: userId,
          reserve_id: reserveId,
          photo_url: photoPath,
          write_up: writeUp,
        })
        .select()
        .single();
      if (insertError) {
        await deletePhoto(photoPath).catch(() => {}); // don't leave an orphaned photo
        throw new Error(insertError.message);
      }
      setStamps((prev) => [...prev, data as Stamp]);
      // Show the just-taken local file straight away instead of downloading it back.
      setPhotoUrls((prev) => ({ ...prev, [photoPath]: photoUri }));
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
      photoUrlFor: (stamp) => (stamp.photo_url ? photoUrls[stamp.photo_url] : undefined),
      addStamp,
    }),
    [status, error, retry, reserves, stamps, photoUrls, addStamp],
  );

  return <PassportContext.Provider value={value}>{children}</PassportContext.Provider>;
}

export function usePassport() {
  const ctx = useContext(PassportContext);
  if (!ctx) throw new Error('usePassport must be used inside <PassportProvider>');
  return ctx;
}
