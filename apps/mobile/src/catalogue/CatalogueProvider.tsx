import { createCatalogueIndex, parseCatalogue, type Catalogue, type CatalogueIndex } from '@sant-vaani/core';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import seed from '../../assets/catalogue.seed.json';
import { track } from '@/analytics';
import { config } from '@/config';
import { loadCatalogue, refreshCatalogue, type CatalogueStore, type RefreshResult } from './load';
import { fileCatalogueStore } from './store';

/** Check for a new catalogue on launch, then at most this often while the app is in use. */
const REFRESH_EVERY_MS = 6 * 60 * 60 * 1000;

type CatalogueValue = {
  catalogue: Catalogue;
  index: CatalogueIndex;
  source: 'cache' | 'bundled' | 'network';
  /** Fetches the latest file now, for example when Ask names an answer this copy lacks. */
  refresh(): Promise<RefreshResult>;
};

export type CatalogueOptions = {
  /** The catalogue shipped in the app. */
  bundled?: Catalogue;
  store?: CatalogueStore;
  /** Where to download updates from; null turns refreshing off. */
  url?: string | null;
  fetch?: typeof fetch;
};

const CatalogueContext = createContext<CatalogueValue | null>(null);

type State = { catalogue: Catalogue; source: CatalogueValue['source']; etag: string | null };

export function CatalogueProvider({ options = {}, children }: { options?: CatalogueOptions; children: ReactNode }) {
  const [deps] = useState(() => ({
    bundled: options.bundled ?? parseCatalogue(seed),
    store: options.store ?? fileCatalogueStore(),
    url: options.url === undefined ? config.catalogueUrl : options.url,
    fetch: options.fetch ?? ((input: string, init?: RequestInit) => globalThis.fetch(input, init)),
  }));
  const [state, setState] = useState<State | null>(null);
  const current = useRef<State | null>(null);
  const inFlight = useRef<Promise<RefreshResult> | null>(null);
  const lastAttempt = useRef(0);

  const refresh = useCallback((): Promise<RefreshResult> => {
    const { url, store, fetch } = deps;
    const now = current.current;
    if (!url || !now) return Promise.resolve({ status: 'unchanged' });
    if (inFlight.current) return inFlight.current;
    lastAttempt.current = Date.now();
    inFlight.current = refreshCatalogue({ url, store, fetch, current: now.catalogue, etag: now.etag })
      .then((result) => {
        if (result.status === 'updated') {
          current.current = { catalogue: result.catalogue, source: 'network', etag: result.etag };
          setState(current.current);
        } else if (result.status === 'failed') {
          console.warn('Catalogue refresh failed:', result.error);
        }
        return result;
      })
      .finally(() => {
        inFlight.current = null;
      });
    return inFlight.current;
  }, [deps]);

  useEffect(() => {
    let live = true;
    const started = Date.now();
    loadCatalogue(deps.store, deps.bundled).then((loaded) => {
      if (!live) return;
      current.current = loaded;
      setState(loaded);
      track('catalogue_loaded', { source: loaded.source, ms: Date.now() - started });
      refresh();
    });
    return () => {
      live = false;
    };
  }, [deps, refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (appState) => {
      if (appState === 'active' && Date.now() - lastAttempt.current > REFRESH_EVERY_MS) refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const value = useMemo<CatalogueValue | null>(
    () =>
      state && {
        catalogue: state.catalogue,
        index: createCatalogueIndex(state.catalogue),
        source: state.source,
        refresh,
      },
    [state, refresh],
  );

  if (!state) return null;
  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>;
}

export function useCatalogue(): CatalogueValue {
  const value = useContext(CatalogueContext);
  if (!value) throw new Error('useCatalogue needs a CatalogueProvider above it');
  return value;
}
