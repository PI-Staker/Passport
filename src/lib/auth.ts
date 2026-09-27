// Anonymous-by-default auth: no signup screen. First launch creates an
// anonymous user; the session is stored on the device and reused after that.
// (Optional email upgrade — magic link/OTP, never a password — comes later.)
import { supabase } from './supabase';

/** Returns the current user's id, signing in anonymously if needed. */
export async function ensureSignedIn(): Promise<string> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (sessionData.session) return sessionData.session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!data.user) throw new Error('Anonymous sign-in returned no user');
  return data.user.id;
}
