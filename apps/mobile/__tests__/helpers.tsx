import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Catalogue } from '@sant-vaani/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReactNode } from 'react';

import { AppProviders } from '@/AppProviders';
import type { CatalogueStore } from '@/catalogue/load';
import type { GitaSource, Verse } from '@/gita/types';
import { PREFS_KEY, type Prefs } from '@/prefs/prefs';
import { sampleCatalogue, TEST_MORNING } from './fixtures/catalogue';

export const VERSE_2_47: Verse = {
  chapter: 2,
  verse: 47,
  speaker: null,
  sanskrit: 'कर्मण्येवाधिकारस्ते मा फलेषु कदा चन ।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥',
  transliteration: "karmaṇy evādhikāras te mā phaleṣu kadā cana |\nmā karmaphalahetur bhūr mā te saṅgo 'stv akarmaṇi ||",
  meaningEn: null,
  meaningHi: null,
};

export function fakeGita(verses: Verse[] = [VERSE_2_47]): GitaSource {
  return {
    chapters: async () => [],
    verses: async (chapter) => verses.filter((v) => v.chapter === chapter),
    verse: async (chapter, verse) => verses.find((v) => v.chapter === chapter && v.verse === verse) ?? null,
  };
}

export function emptyStore(): CatalogueStore {
  return { read: async () => null, write: async () => {} };
}

/** Saves preferences the way the app does, before the providers load them. */
export async function seedPrefs(prefs: Partial<Prefs>) {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export const ADULT = { ageConfirmedAt: '2026-10-20T10:00:00.000Z' } satisfies Partial<Prefs>;

export function TestProviders({
  children,
  catalogue = sampleCatalogue,
  now = TEST_MORNING,
  gita = fakeGita(),
  supabase = null,
}: {
  children: ReactNode;
  catalogue?: Catalogue;
  now?: Date;
  gita?: GitaSource;
  supabase?: SupabaseClient | null;
}) {
  return (
    <AppProviders
      clock={() => now}
      catalogue={{ bundled: catalogue, store: emptyStore(), url: null }}
      openGita={async () => gita}
      systemScheme="light"
      supabase={supabase}
    >
      {children}
    </AppProviders>
  );
}
