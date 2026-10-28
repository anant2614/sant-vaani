import { parseCatalogue } from '@sant-vaani/core';

import bundledSeed from '../assets/catalogue.seed.json';
import { loadCatalogue, refreshCatalogue, type CatalogueStore } from '@/catalogue/load';
import { sampleCatalogue } from './fixtures/catalogue';

function memoryStore(initial: string | null = null) {
  let saved = initial;
  return {
    read: jest.fn(async (): Promise<string | null> => saved),
    write: jest.fn(async (text: string) => {
      saved = text;
    }),
    get saved() {
      return saved;
    },
  } satisfies CatalogueStore & { saved: string | null };
}

const cacheOf = (catalogue: unknown, etag: string | null = '"v1"') => JSON.stringify({ etag, catalogue });
const older = { ...sampleCatalogue, generatedAt: '2026-10-01T21:30:00.000Z' };
const newer = { ...sampleCatalogue, generatedAt: '2026-10-28T21:30:00.000Z' };

describe('loadCatalogue', () => {
  test('loads the bundled catalogue when there is no cache', async () => {
    const loaded = await loadCatalogue(memoryStore(null), sampleCatalogue);

    expect(loaded.source).toBe('bundled');
    expect(loaded.catalogue.generatedAt).toBe(sampleCatalogue.generatedAt);
    expect(loaded.etag).toBeNull();
  });

  test('uses the downloaded copy when it is newer than the bundled one', async () => {
    const loaded = await loadCatalogue(memoryStore(cacheOf(newer, '"abc"')), sampleCatalogue);

    expect(loaded.source).toBe('cache');
    expect(loaded.catalogue.generatedAt).toBe(newer.generatedAt);
    expect(loaded.etag).toBe('"abc"');
  });

  test('keeps the bundled catalogue after an app update ships a newer one', async () => {
    const loaded = await loadCatalogue(memoryStore(cacheOf(older)), sampleCatalogue);

    expect(loaded.source).toBe('bundled');
    expect(loaded.catalogue.generatedAt).toBe(sampleCatalogue.generatedAt);
  });

  test.each([
    ['broken JSON', '{"etag":'],
    ['a file in another shape', JSON.stringify({ etag: null, catalogue: { version: 2 } })],
    ['a read error', new Error('disk error')],
  ])('falls back to the bundled catalogue on %s', async (_, cached) => {
    const store = memoryStore(typeof cached === 'string' ? cached : null);
    if (cached instanceof Error) {
      store.read.mockRejectedValueOnce(cached);
      jest.spyOn(console, 'warn').mockImplementationOnce(() => {});
    }

    const loaded = await loadCatalogue(store, sampleCatalogue);

    expect(loaded.source).toBe('bundled');
  });

  test('the catalogue shipped in the app is valid', () => {
    expect(() => parseCatalogue(bundledSeed)).not.toThrow();
  });
});

describe('refreshCatalogue', () => {
  const URL = 'https://example.supabase.co/storage/v1/object/public/catalogue/v1.json';
  const reply = (status: number, body?: unknown, etag?: string) =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: etag ? { ETag: etag } : {},
    });

  test('saves a newer catalogue with its ETag', async () => {
    const store = memoryStore();
    const fetch = jest.fn(async () => reply(200, newer, '"v2"'));

    const result = await refreshCatalogue({ url: URL, store, fetch, current: sampleCatalogue, etag: '"v1"' });

    expect(fetch).toHaveBeenCalledWith(URL, { headers: { 'If-None-Match': '"v1"' } });
    expect(result).toEqual({ status: 'updated', catalogue: newer, etag: '"v2"' });
    expect(JSON.parse(store.saved ?? 'null')).toEqual({ etag: '"v2"', catalogue: newer });
  });

  test('leaves things alone when the file has not changed', async () => {
    const store = memoryStore();

    const notModified = await refreshCatalogue({
      url: URL,
      store,
      fetch: async () => reply(304),
      current: sampleCatalogue,
      etag: '"v1"',
    });
    const sameFile = await refreshCatalogue({
      url: URL,
      store,
      fetch: async () => reply(200, older, '"v0"'),
      current: sampleCatalogue,
      etag: null,
    });

    expect(notModified).toEqual({ status: 'unchanged' });
    expect(sameFile).toEqual({ status: 'unchanged' });
    expect(store.write).not.toHaveBeenCalled();
  });

  test('keeps the current catalogue when the download fails or is invalid', async () => {
    const store = memoryStore();
    const attempts = [
      async () => reply(500),
      async () => reply(200, { version: 1, generatedAt: 'x' }),
      async () => {
        throw new TypeError('Network request failed');
      },
    ];

    for (const fetch of attempts) {
      const result = await refreshCatalogue({ url: URL, store, fetch, current: sampleCatalogue, etag: null });
      expect(result.status).toBe('failed');
    }
    expect(store.write).not.toHaveBeenCalled();
  });
});
