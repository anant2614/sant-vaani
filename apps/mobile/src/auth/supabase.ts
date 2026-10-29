import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { config } from '@/config';

let client: SupabaseClient | null | undefined;

/** The Supabase client, or null in builds made without Supabase settings. */
export function supabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  if (!config.supabase) return (client = null);

  const created = createClient(config.supabase.url, config.supabase.key, {
    auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  });
  if (Platform.OS !== 'web') {
    // Refresh the session only while the app is in front, as Supabase advises for phones.
    AppState.addEventListener('change', (state) => {
      if (state === 'active') created.auth.startAutoRefresh();
      else created.auth.stopAutoRefresh();
    });
  }
  return (client = created);
}
