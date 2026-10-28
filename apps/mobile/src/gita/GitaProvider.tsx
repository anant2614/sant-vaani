import type { VerseRef } from '@sant-vaani/core';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { openGita } from './db';
import type { GitaSource, Verse } from './types';

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

/** The verse's text, or null while the Gita opens or if the reference is unknown. */
export function useVerse(ref: VerseRef | null): Verse | null {
  const source = useGita();
  const [verse, setVerse] = useState<Verse | null>(null);
  const chapter = ref?.chapter;
  const number = ref?.verse;

  useEffect(() => {
    if (!source || chapter === undefined || number === undefined) {
      setVerse(null);
      return;
    }
    let live = true;
    source.verse(chapter, number).then(
      (found) => {
        if (live) setVerse(found);
      },
      (error) => console.warn(`Could not read Gita ${chapter}.${number}`, error),
    );
    return () => {
      live = false;
    };
  }, [source, chapter, number]);

  return verse;
}
