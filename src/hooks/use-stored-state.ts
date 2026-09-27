// useState that remembers its value on this device (via the localStorage that
// expo-sqlite installs — see lib/supabase.ts). For small UI preferences only.
import { useState } from 'react';

import '@/lib/supabase'; // ensures the localStorage polyfill is installed first

function read<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  try {
    const value = localStorage.getItem(key);
    return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useStoredChoice<T extends string>(key: string, fallback: T, allowed: readonly T[]) {
  const [value, setValue] = useState<T>(() => read(key, fallback, allowed));
  const update = (next: T) => {
    setValue(next);
    try {
      localStorage.setItem(key, next);
    } catch {
      // not critical — the choice just won't be remembered
    }
  };
  return [value, update] as const;
}
