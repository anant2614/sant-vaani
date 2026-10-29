import type { VerseRef } from '@sant-vaani/core';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { openGita } from './db';
import type { Chapter, GitaSource, Verse } from './types';

const GitaContext = createContext<GitaSource | null>(null);

/** Opens the bundled Gita in the background; screens show verse text once it is ready. */
export function GitaProvider({ open = openGita, children }: { open?: () => Promise<GitaSource>; children: ReactNode }) {
  const [opener] = useState(() => open);
  const [source, setSource] = useState<GitaSource | null>(null);

  useEffect(() => {
    let live = true;
    opener().then(
      (opened) => {
        if (live) setSource(opened);
      },
      (error) => console.warn('Could not open the Gita', error),
    );
    return () => {
      live = false;
    };
  }, [opener]);

  return <GitaContext.Provider value={source}>{children}</GitaContext.Provider>;
}

export function useGita(): GitaSource | null {
  return useContext(GitaContext);
}

/** All chapters, or null while the Gita opens. */
export function useChapters(): Chapter[] | null {
  const source = useGita();
  const [loaded, setLoaded] = useState<{ source: GitaSource; chapters: Chapter[] } | null>(null);

  useEffect(() => {
    if (!source) return;
    let live = true;
    source.chapters().then(
      (chapters) => {
        if (live) setLoaded({ source, chapters });
      },
      (error) => console.warn('Could not read the chapters', error),
    );
    return () => {
      live = false;
    };
  }, [source]);

  return loaded?.source === source ? loaded.chapters : null;
}

/** A chapter's verses, or null while they load. */
export function useChapterVerses(chapter: number): Verse[] | null {
  const source = useGita();
  const [loaded, setLoaded] = useState<{ source: GitaSource; chapter: number; verses: Verse[] } | null>(null);

  useEffect(() => {
    if (!source) return;
    let live = true;
    source.verses(chapter).then(
      (verses) => {
        if (live) setLoaded({ source, chapter, verses });
      },
      (error) => console.warn(`Could not read chapter ${chapter}`, error),
    );
    return () => {
      live = false;
    };
  }, [source, chapter]);

  return loaded?.source === source && loaded.chapter === chapter ? loaded.verses : null;
}

/** The verse's text, or null while the Gita opens or if the reference is unknown. */
export function useVerse(ref: VerseRef | null): Verse | null {
  return useVerseLookup(ref) ?? null;
}

/** Like useVerse, but undefined while loading, so a screen can tell a missing verse from a slow one. */
export function useVerseLookup(ref: VerseRef | null): Verse | null | undefined {
  const source = useGita();
  const chapter = ref?.chapter;
  const number = ref?.verse;
  const [loaded, setLoaded] = useState<{ source: GitaSource; key: string; verse: Verse | null } | null>(null);

  useEffect(() => {
    if (!source || chapter === undefined || number === undefined) return;
    let live = true;
    source.verse(chapter, number).then(
      (verse) => {
        if (live) setLoaded({ source, key: `${chapter}.${number}`, verse });
      },
      (error) => console.warn(`Could not read Gita ${chapter}.${number}`, error),
    );
    return () => {
      live = false;
    };
  }, [source, chapter, number]);

  if (chapter === undefined || number === undefined) return null;
  return loaded?.source === source && loaded.key === `${chapter}.${number}` ? loaded.verse : undefined;
}
