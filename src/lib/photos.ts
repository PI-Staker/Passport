// Stamp photos: shrink on the phone, upload to the private `stamp-photos`
// bucket, and turn stored paths back into short-lived viewing links.
// Kept separate from the camera UI and the passport store so each part can be
// tested on its own.
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

const BUCKET = 'stamp-photos';
const MAX_WIDTH = 1600; // plenty to read an entrance sign
const JPEG_QUALITY = 0.7; // typically ~200–400 KB per photo

/** Resize + recompress a camera photo. Returns a new local file uri. */
export async function compressPhoto(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: MAX_WIDTH, height: null });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
  return result.uri;
}

/**
 * Lets the user choose a photo from their gallery (e.g. taken earlier with the
 * phone's own camera at a gate with no signal). Returns a compressed local uri,
 * or null if they cancelled. Re-encoding also strips EXIF (incl. GPS) metadata.
 */
export async function pickFromGallery(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  if (result.canceled || result.assets.length === 0) return null;
  return compressPhoto(result.assets[0].uri);
}

/**
 * Uploads a local JPEG to `<userId>/<random>.jpg` and returns that storage
 * path — which is what `stamps.photo_url` stores (see schema.sql).
 */
export async function uploadPhoto(localUri: string, userId: string): Promise<string> {
  const bytes = await new File(localUri).arrayBuffer();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  return path;
}

/** Best-effort cleanup, e.g. when the stamp row fails to save after upload. */
export async function deletePhoto(path: string) {
  await supabase.storage.from(BUCKET).remove([path]);
}

/** Deletes a local temp file; ignores errors (it's only a cache file). */
export function deleteLocalFile(uri: string) {
  try {
    new File(uri).delete();
  } catch {
    // already gone — fine
  }
}

const SIGNED_URL_SECONDS = 60 * 60; // 1 hour

/** Map of storage path → temporary viewing URL. Skips empty paths. */
export async function getPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  const real = paths.filter(Boolean);
  if (real.length === 0) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(real, SIGNED_URL_SECONDS);
  if (error) throw error;
  const urls: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  }
  return urls;
}
