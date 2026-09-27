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
/** newPhotoUri set = replace the photo (old one is deleted from storage after). */
type StampEdit = { writeUp: string | null; newPhotoUri?: string };
type Status = 'loading' | 'ready' | 'error';

type PassportContextValue = {
  status: Status;
  error: string | null;
  retry: () => void;
  reserves: Reserve[];
  stamps: Stamp[];
  getReserve: (id: string) => Reserve | undefined;
  getStamp: (id: string) => Stamp | undefined;
  /** Visits to one reserve, newest first. */
  stampsFor: (reserveId: string) => Stamp[];
  /** Viewable URL for a stamp's photo, or undefined if none / not loaded. */
  photoUrlFor: (stamp: Stamp) => string | undefined;
  /** Uploads the photo, then saves the stamp. Throws on failure so the caller can tell the user. */
  addStamp: (stamp: NewStamp) => Promise<void>;
  /** Edits a visit's write-up and/or replaces its photo. Throws on failure. */
  updateStamp: (stampId: string, edit: StampEdit) => Promise<void>;
  /** Deletes a visit and its photo. Throws on failure. */
  deleteStamp: (stampId: string) => Promise<void>;
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

  const updateStamp = useCallback(
    async (stampId: string, { writeUp, newPhotoUri }: StampEdit) => {
      if (!userId) throw new Error('Not signed in yet');
      const existing = stamps.find((s) => s.id === stampId);
      if (!existing) throw new Error('Visit not found');

      // Upload the new photo first; only remove the old one once the row points
      // at the new one, so a failure never leaves the visit without a photo.
      const photoPath = newPhotoUri ? await uploadPhoto(newPhotoUri, userId) : existing.photo_url;
      const { data, error: updateError } = await supabase
        .from('stamps')
        .update({ write_up: writeUp, photo_url: photoPath })
        .eq('id', stampId)
        .select()
        .single();
      if (updateError) {
        if (newPhotoUri) await deletePhoto(photoPath).catch(() => {});
        throw new Error(updateError.message);
      }
      if (newPhotoUri && existing.photo_url) await deletePhoto(existing.photo_url).catch(() => {});

      setStamps((prev) => prev.map((s) => (s.id === stampId ? (data as Stamp) : s)));
      if (newPhotoUri) setPhotoUrls((prev) => ({ ...prev, [photoPath]: newPhotoUri }));
    },
    [userId, stamps],
  );

  const deleteStamp = useCallback(
    async (stampId: string) => {
      const existing = stamps.find((s) => s.id === stampId);
      if (!existing) throw new Error('Visit not found');
      // .select() returns the deleted rows — empty means nothing was deleted.
      const { data, error: deleteError } = await supabase
        .from('stamps')
        .delete()
        .eq('id', stampId)
        .select('id');
      if (deleteError) throw new Error(deleteError.message);
      if (!data || data.length === 0) throw new Error('Visit could not be deleted');
      if (existing.photo_url) await deletePhoto(existing.photo_url).catch(() => {});
      setStamps((prev) => prev.filter((s) => s.id !== stampId));
      // TODO(Step 5): recompute challenge_progress here too.
    },
    [stamps],
  );

  const value = useMemo<PassportContextValue>(
    () => ({
      status,
      error,
      retry,
      reserves,
      stamps,
      getReserve: (id) => reserves.find((r) => r.id === id),
      getStamp: (id) => stamps.find((s) => s.id === id),
      stampsFor: (reserveId) =>
        stamps
          .filter((s) => s.reserve_id === reserveId)
          .sort((a, b) => b.visited_at.localeCompare(a.visited_at)),
      photoUrlFor: (stamp) => (stamp.photo_url ? photoUrls[stamp.photo_url] : undefined),
      addStamp,
      updateStamp,
      deleteStamp,
    }),
    [status, error, retry, reserves, stamps, photoUrls, addStamp, updateStamp, deleteStamp],
  );

  return <PassportContext.Provider value={value}>{children}</PassportContext.Provider>;
}

export function usePassport() {
  const ctx = useContext(PassportContext);
  if (!ctx) throw new Error('usePassport must be used inside <PassportProvider>');
  return ctx;
}
