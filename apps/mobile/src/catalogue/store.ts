import { CATALOGUE_FILE } from '@sant-vaani/core';
import { File, Paths } from 'expo-file-system';

import type { CatalogueStore } from './load';

/** The downloaded catalogue lives in the app's documents folder. */
export function fileCatalogueStore(): CatalogueStore {
  const file = () => new File(Paths.document, `catalogue-${CATALOGUE_FILE}`);
  return {
    async read() {
      const f = file();
      return f.exists ? f.text() : null;
    },
    async write(text) {
      await file().write(text);
    },
  };
}
