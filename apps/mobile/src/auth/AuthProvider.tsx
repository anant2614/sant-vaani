import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { getCalendars } from 'expo-localization';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { identify } from '@/analytics';
import { usePrefs } from '@/prefs/PrefsProvider';
import { supabase } from './supabase';

type Auth = {
  /** The guest account's id once signed in. */
  userId: string | null;
  status: 'off' | 'waiting' | 'signing-in' | 'signed-in' | 'failed';
};

const AuthContext = createContext<Auth>({ userId: null, status: 'off' });

/**
 * Everyone starts as a guest: once they confirm they are 18 or older, the
 * app signs in anonymously so Ask, notes and reminders can work. Without a
 * network it tries again the next time the app comes to the front.
 */
export function AuthProvider({ client = supabase(), children }: { client?: SupabaseClient | null; children: ReactNode }) {
  const { prefs } = usePrefs();
  const confirmed = prefs.ageConfirmedAt !== null;
  const [auth, setAuth] = useState<Auth>({ userId: null, status: client ? 'waiting' : 'off' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!client || !confirmed) return;
    let live = true;
    const signedIn = (session: Session | null) => {
      if (!live) return;
      if (session) {
        identify(session.user.id);
        setAuth({ userId: session.user.id, status: 'signed-in' });
      } else {
        setAuth({ userId: null, status: 'waiting' });
      }
    };

    setAuth((current) => (current.status === 'signed-in' ? current : { userId: null, status: 'signing-in' }));
    (async () => {
      const { data } = await client.auth.getSession();
      if (data.session) return signedIn(data.session);
      const { data: created, error } = await client.auth.signInAnonymously();
      if (error) throw error;
      signedIn(created.session);
    })().catch((error: unknown) => {
      console.warn('Guest sign-in failed; trying again later', error);
      if (live) setAuth({ userId: null, status: 'failed' });
    });

    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      // Supabase calls this synchronously; defer so no Supabase call runs inside it.
      if (session || event === 'SIGNED_OUT') setTimeout(() => signedIn(session), 0);
    });
    return () => {
      live = false;
      listener.subscription.unsubscribe();
    };
  }, [client, confirmed, attempt]);

  useEffect(() => {
    if (auth.status !== 'failed') return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setAttempt((n) => n + 1);
    });
    return () => subscription.remove();
  }, [auth.status]);

  // Keeps the profile in step with the choices made on this phone.
  const { language, themePref, cityId, ageConfirmedAt } = prefs;
  useEffect(() => {
    if (!client || !auth.userId) return;
    client
      .from('profiles')
      .update({
        language,
        theme_pref: themePref,
        city_id: cityId,
        age_confirmed_at: ageConfirmedAt,
        time_zone: getCalendars()[0]?.timeZone ?? null,
      })
      .eq('user_id', auth.userId)
      .then(({ error }) => {
        if (error) console.warn('Could not save the profile', error.message);
      });
  }, [client, auth.userId, language, themePref, cityId, ageConfirmedAt]);

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  return useContext(AuthContext);
}
