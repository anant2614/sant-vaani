import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATALOGUE_FILE } from '@sant-vaani/core';

import type { CatalogueStore } from './load';

const KEY = `sant-vaani:catalogue-${CATALOGUE_FILE}`;

/** The web build has no file system, so the catalogue goes in local storage. */
export function fileCatalogueStore(): CatalogueStore {
  return {
    read: () => AsyncStorage.getItem(KEY),
    write: (text) => AsyncStorage.setItem(KEY, text),
  };
}
