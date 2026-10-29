import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { useClock } from '@/clock';
import { createUserStore, isSaved, noteFor, type Note, type SaveKind, type UserData, type UserStore } from './localStore';
import { syncUserData } from './sync';

/** How long after a change to wait before syncing, so a burst of edits goes in one call. */
const SYNC_DELAY_MS = 2000;

const UserDataContext = createContext<UserStore | null>(null);

/**
 * Holds the person's notes, saves and path progress. Screens read and
 * write them on the phone; once the guest account is signed in, changes go
 * to the server shortly after they are made and whenever the app comes
 * back to the front.
 */
export function UserDataProvider({ store: given, children }: { store?: UserStore; children: ReactNode }) {
  const clock = useClock();
  const [store] = useState(() => given ?? createUserStore({ clock }));
  const { client, status } = useAuth();

  useEffect(() => {
    store.load();
  }, [store]);

  useEffect(() => {
    if (!client || status !== 'signed-in') return;
    let running: Promise<unknown> = Promise.resolve();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sync = () => {
      // One at a time, so nothing is sent twice.
      running = running.then(() =>
        syncUserData(store, client).catch((error: unknown) => console.warn('Sync failed; trying again later', error)),
      );
    };
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(sync, SYNC_DELAY_MS);
    };

    sync();
    const unsubscribe = store.subscribe(soon);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
      appState.remove();
    };
  }, [store, client, status]);

  return <UserDataContext.Provider value={store}>{children}</UserDataContext.Provider>;
}

export function useUserStore(): UserStore {
  const store = useContext(UserDataContext);
  if (!store) throw new Error('useUserStore needs a UserDataProvider above it');
  return store;
}

/** Notes and saves as they are now, or null while they load from the phone. */
export function useUserData(): UserData | null {
  const store = useUserStore();
  return useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
}

export function useVerseNote(chapter: number, verse: number): Note | null {
  return noteFor(useUserData(), chapter, verse);
}

export function useIsSaved(kind: SaveKind, ref: string): boolean {
  return isSaved(useUserData(), kind, ref);
}
