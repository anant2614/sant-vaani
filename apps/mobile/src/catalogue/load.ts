import { safeParseCatalogue, type Catalogue } from '@sant-vaani/core';

/** Where the downloaded catalogue is kept on the phone. */
export type CatalogueStore = {
  read(): Promise<string | null>;
  write(text: string): Promise<void>;
};

/** The cached file: the catalogue plus the ETag it was served with. */
type CachedCatalogue = { etag: string | null; catalogue: unknown };

export type LoadedCatalogue = {
  catalogue: Catalogue;
  source: 'cache' | 'bundled';
  /** ETag of the cached copy, sent back so an unchanged file is not downloaded again. */
  etag: string | null;
};

/**
 * What Today opens with: the downloaded copy if it is readable and newer
 * than the one shipped in the app, otherwise the shipped one. Never waits
 * on the network.
 */
export async function loadCatalogue(store: CatalogueStore, bundled: Catalogue): Promise<LoadedCatalogue> {
  const fallback: LoadedCatalogue = { catalogue: bundled, source: 'bundled', etag: null };
  let text: string | null;
  try {
    text = await store.read();
  } catch (error) {
    console.warn('Could not read the saved catalogue', error);
    return fallback;
  }
  if (!text) return fallback;

  let cached: CachedCatalogue;
  try {
    cached = JSON.parse(text) as CachedCatalogue;
  } catch {
    return fallback;
  }
  const parsed = safeParseCatalogue(cached?.catalogue);
  if (!parsed.success) return fallback;
  if (!isNewer(parsed.data, bundled)) return fallback;
  return { catalogue: parsed.data, source: 'cache', etag: typeof cached.etag === 'string' ? cached.etag : null };
}

export type RefreshResult =
  | { status: 'updated'; catalogue: Catalogue; etag: string | null }
  | { status: 'unchanged' }
  | { status: 'failed'; error: string };

/**
 * Downloads the latest catalogue and saves it when it is newer than the
 * one in use. A failed or invalid download changes nothing.
 */
export async function refreshCatalogue({
  url,
  store,
  fetch,
  current,
  etag,
}: {
  url: string;
  store: CatalogueStore;
  fetch: (url: string, init: { headers: Record<string, string> }) => Promise<Response>;
  current: Catalogue;
  etag: string | null;
}): Promise<RefreshResult> {
  try {
    const response = await fetch(url, { headers: etag ? { 'If-None-Match': etag } : {} });
    if (response.status === 304) return { status: 'unchanged' };
    if (!response.ok) return { status: 'failed', error: `The catalogue download returned ${response.status}.` };

    const parsed = safeParseCatalogue(await response.json());
    if (!parsed.success) return { status: 'failed', error: 'The downloaded catalogue is not in the expected format.' };
    if (!isNewer(parsed.data, current)) return { status: 'unchanged' };

    const newEtag = response.headers.get('ETag');
    await store.write(JSON.stringify({ etag: newEtag, catalogue: parsed.data } satisfies CachedCatalogue));
    return { status: 'updated', catalogue: parsed.data, etag: newEtag };
  } catch (error) {
    return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
  }
}

function isNewer(candidate: Catalogue, than: Catalogue): boolean {
  return Date.parse(candidate.generatedAt) > Date.parse(than.generatedAt);
}
