import { supabase, isSupabaseConfigured } from './client';

const DEVICE_UID_KEY = 'turfscore_device_uid_v1';

/**
 * Generates or retrieves a persistent device user UUID for anonymous scoring sessions.
 */
export function getOrCreateDeviceUserId(): string {
  if (typeof window === 'undefined') {
    return '00000000-0000-0000-0000-000000000000';
  }

  let deviceUid = localStorage.getItem(DEVICE_UID_KEY);
  if (!deviceUid) {
    // Generate valid RFC4122 v4 UUID
    deviceUid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    localStorage.setItem(DEVICE_UID_KEY, deviceUid);
  }
  return deviceUid;
}

/**
 * Ensures an active Supabase anonymous session or returns the device owner ID.
 */
export async function ensureAnonymousSession(): Promise<string> {
  const fallbackUid = getOrCreateDeviceUserId();

  if (!isSupabaseConfigured) {
    return fallbackUid;
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      return sessionData.session.user.id;
    }

    // Try signing in anonymously
    const { data: authData, error } = await supabase.auth.signInAnonymously();
    if (!error && authData?.user) {
      return authData.user.id;
    }
  } catch (err) {
    console.warn('Supabase anonymous sign-in unavailable, using local device ID:', err);
  }

  return fallbackUid;
}
