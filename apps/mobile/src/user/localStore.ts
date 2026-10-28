import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VerseRef } from '@sant-vaani/core';
import { randomUUID } from 'expo-crypto';

import { verseFromSaveRef } from '@/gita/reader';

/** A note on a Gita verse, as the notes table stores it. */
export type Note = {
  id: string;
  chapter: number;
  verse: number;
  body: string;
  createdAt: string;
  updatedAt: string;
  /** Set when deleted, so the deletion can reach the server. */
  deletedAt: string | null;
};

export type SaveKind = 'answer' | 'clip' | 'verse' | 'path';
export type Save = { kind: SaveKind; ref: string; createdAt: string };
export type SaveChange = { kind: SaveKind; ref: string; saved: boolean };
/** A day of a seven-day path the person marked done. */
export type DayDone = { pathId: string; day: number; completedAt: string };

/** Each change bumps the revision; the server has seen up to syncedRevision. */
type StoredNote = Note & { revision: number; syncedRevision: number };

export type UserData = {
  notes: Record<string, StoredNote>;
  /** By `${kind}:${ref}`. */
  saves: Record<string, Save>;
  /** Saves made (true) or removed (false) here that the server has not seen. */
  pendingSaves: Record<string, boolean>;
  /** By `${pathId}:${day}`. */
  progress: Record<string, DayDone>;
  /** Days done here that the server has not seen, by the same key. */
  pendingProgress: Record<string, true>;
};

export const USER_DATA_KEY = 'sant-vaani:user-data';
/** The notes table allows no more. */
export const MAX_NOTE_LENGTH = 10_000;

const SAVE_KINDS: readonly SaveKind[] = ['answer', 'clip', 'verse', 'path'];
const saveKey = (kind: SaveKind, ref: string) => `${kind}:${ref}`;
const dayKey = (pathId: string, day: number) => `${pathId}:${day}`;

export function emptyUserData(): UserData {
  return { notes: {}, saves: {}, pendingSaves: {}, progress: {}, pendingProgress: {} };
}

/** The person's note on a verse, if they have one. */
export function noteFor(data: UserData | null, chapter: number, verse: number): Note | null {
  if (!data) return null;
  return (
    Object.values(data.notes)
      .filter((note) => note.chapter === chapter && note.verse === verse && !note.deletedAt)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
  );
}

export function isSaved(data: UserData | null, kind: SaveKind, ref: string): boolean {
  return Boolean(data?.saves[saveKey(kind, ref)]);
}

/** When each day of a path was done, by day number. */
export function pathCompletions(data: UserData | null, pathId: string): Record<number, { completedAt: string }> {
  const days: Record<number, { completedAt: string }> = {};
  for (const done of Object.values(data?.progress ?? {})) {
    if (done.pathId === pathId) days[done.day] = { completedAt: done.completedAt };
  }
  return days;
}

/** Refs of everything saved of one kind, newest first. */
export function savedRefs(data: UserData | null, kind: SaveKind): string[] {
  return Object.values(data?.saves ?? {})
    .filter((save) => save.kind === kind)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((save) => save.ref);
}

export type MyVerse = VerseRef & { saved: boolean; note: string | null };

/** Verses the person saved or wrote about, in Gita order. */
export function myVerses(data: UserData | null): MyVerse[] {
  if (!data) return [];
  const byRef = new Map<string, MyVerse>();
  const entry = (ref: VerseRef) => {
    const key = `${ref.chapter}.${ref.verse}`;
    const found = byRef.get(key) ?? { ...ref, saved: false, note: null };
    byRef.set(key, found);
    return found;
  };
  for (const save of Object.values(data.saves)) {
    const ref = save.kind === 'verse' ? verseFromSaveRef(save.ref) : null;
    if (ref) entry(ref).saved = true;
  }
  for (const note of Object.values(data.notes)) {
    if (!note.deletedAt) entry(note).note = note.body;
  }
  return [...byRef.values()].sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
}

export type UserStoreOptions = {
  storage?: Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;
  newId?: () => string;
  clock?: () => Date;
};

export type UserStore = ReturnType<typeof createUserStore>;

/**
 * Notes, saves and path progress, kept on the phone first. Every change is
 * written to the phone before it counts, and stays pending until a sync
 * confirms the server has it, so nothing is lost offline or when the app
 * is closed.
 */
export function createUserStore({ storage = AsyncStorage, newId = randomUUID, clock = () => new Date() }: UserStoreOptions = {}) {
  let data: UserData | null = null;
  let loading: Promise<UserData> | null = null;
  let queue: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();

  function load(): Promise<UserData> {
    if (data) return Promise.resolve(data);
    loading ??= storage
      .getItem(USER_DATA_KEY)
      .then(readUserData, (error: unknown) => {
        console.warn('Could not read notes, saves and progress', error);
        return emptyUserData();
      })
      .then((loaded) => {
        data ??= loaded;
        listeners.forEach((listener) => listener());
        return data;
      });
    return loading;
  }

  /** Runs changes one at a time; each is saved on the phone before anyone sees it. */
  function change<T>(apply: (current: UserData) => { next: UserData; result: T } | null): Promise<T | null> {
    const run = queue.then(async () => {
      const applied = apply(await load());
      if (!applied) return null;
      await storage.setItem(USER_DATA_KEY, JSON.stringify(applied.next));
      data = applied.next;
      listeners.forEach((listener) => listener());
      return applied.result;
    });
    queue = run.catch(() => {});
    return run;
  }

  const now = () => clock().toISOString();

  async function deleteNote(id: string): Promise<void> {
    await change((current) => {
      const stored = current.notes[id];
      if (!stored || stored.deletedAt) return null;
      const notes = { ...current.notes };
      if (stored.syncedRevision === 0) {
        // The server never had it.
        delete notes[id];
      } else {
        const time = now();
        notes[id] = { ...stored, body: '', updatedAt: time, deletedAt: time, revision: stored.revision + 1 };
      }
      return { next: { ...current, notes }, result: null };
    });
  }

  return {
    load,
    /** The data as last loaded, for useSyncExternalStore. */
    snapshot: (): UserData | null => data,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** Writes the person's note on a verse. A blank note deletes it. */
    async saveNote({ chapter, verse, body }: { chapter: number; verse: number; body: string }): Promise<Note | null> {
      const text = body.trim();
      if (text.length > MAX_NOTE_LENGTH) throw new Error(`A note can be at most ${MAX_NOTE_LENGTH} characters.`);
      if (!text) {
        const existing = noteFor(await load(), chapter, verse);
        if (existing) await deleteNote(existing.id);
        return null;
      }
      return change((current) => {
        const existing = noteFor(current, chapter, verse);
        const stored = existing ? current.notes[existing.id] : undefined;
        const time = now();
        const note: StoredNote = stored
          ? { ...stored, body: text, updatedAt: time, revision: stored.revision + 1 }
          : { id: newId(), chapter, verse, body: text, createdAt: time, updatedAt: time, deletedAt: null, revision: 1, syncedRevision: 0 };
        return { next: { ...current, notes: { ...current.notes, [note.id]: note } }, result: toNote(note) };
      });
    },

    deleteNote,

    async setSaved(kind: SaveKind, ref: string, saved: boolean): Promise<void> {
      await change((current) => {
        const key = saveKey(kind, ref);
        if (Boolean(current.saves[key]) === saved) return null;
        const saves = { ...current.saves };
        if (saved) saves[key] = { kind, ref, createdAt: now() };
        else delete saves[key];
        return { next: { ...current, saves, pendingSaves: { ...current.pendingSaves, [key]: saved } }, result: null };
      });
    },

    /** Marks a day of a path done. A day is done once; doing it again changes nothing. */
    async completeDay(pathId: string, day: number): Promise<void> {
      await change((current) => {
        const key = dayKey(pathId, day);
        if (current.progress[key]) return null;
        return {
          next: {
            ...current,
            progress: { ...current.progress, [key]: { pathId, day, completedAt: now() } },
            pendingProgress: { ...current.pendingProgress, [key]: true },
          },
          result: null,
        };
      });
    },

    /** What the server has not seen yet. */
    async pending(): Promise<{ notes: (Note & { revision: number })[]; saves: SaveChange[]; progress: DayDone[] }> {
      const current = await load();
      return {
        progress: Object.keys(current.pendingProgress).flatMap((key) => {
          const done = current.progress[key];
          return done ? [done] : [];
        }),
        notes: Object.values(current.notes)
          .filter((note) => note.revision > note.syncedRevision)
          .map((note) => ({ ...toNote(note), revision: note.revision })),
        saves: Object.entries(current.pendingSaves).flatMap(([key, saved]) => {
          const [kind, ...rest] = key.split(':');
          return SAVE_KINDS.includes(kind as SaveKind) ? [{ kind: kind as SaveKind, ref: rest.join(':'), saved }] : [];
        }),
      };
    },

    /** Records what the server confirmed. Anything changed since stays pending. */
    async markSynced({
      notes = [],
      saves = [],
      progress = [],
    }: {
      notes?: { id: string; revision: number }[];
      saves?: SaveChange[];
      progress?: Pick<DayDone, 'pathId' | 'day'>[];
    }) {
      if (notes.length === 0 && saves.length === 0 && progress.length === 0) return;
      await change((current) => {
        const nextNotes = { ...current.notes };
        for (const { id, revision } of notes) {
          const stored = nextNotes[id];
          if (!stored) continue;
          const syncedRevision = Math.max(stored.syncedRevision, revision);
          // A deletion the server has seen needs nothing more from this phone.
          if (stored.deletedAt && syncedRevision === stored.revision) delete nextNotes[id];
          else nextNotes[id] = { ...stored, syncedRevision };
        }
        const pendingSaves = { ...current.pendingSaves };
        for (const { kind, ref, saved } of saves) {
          const key = saveKey(kind, ref);
          if (pendingSaves[key] === saved) delete pendingSaves[key];
        }
        const pendingProgress = { ...current.pendingProgress };
        for (const { pathId, day } of progress) delete pendingProgress[dayKey(pathId, day)];
        return { next: { ...current, notes: nextNotes, pendingSaves, pendingProgress }, result: null };
      });
    },

    /** Forgets everything, as when the account is deleted. */
    async clear(): Promise<void> {
      const run = queue.then(async () => {
        await storage.removeItem(USER_DATA_KEY);
        data = emptyUserData();
        listeners.forEach((listener) => listener());
      });
      queue = run.catch(() => {});
      await run;
    },
  };
}

function toNote({ revision: _revision, syncedRevision: _synced, ...note }: StoredNote): Note {
  return note;
}

/** Reads the saved data, starting empty if it is missing or damaged. */
function readUserData(saved: string | null): UserData {
  if (!saved) return emptyUserData();
  try {
    const parsed = JSON.parse(saved) as Partial<UserData>;
    return {
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
      saves: parsed.saves && typeof parsed.saves === 'object' ? parsed.saves : {},
      pendingSaves: parsed.pendingSaves && typeof parsed.pendingSaves === 'object' ? parsed.pendingSaves : {},
      progress: parsed.progress && typeof parsed.progress === 'object' ? parsed.progress : {},
      pendingProgress: parsed.pendingProgress && typeof parsed.pendingProgress === 'object' ? parsed.pendingProgress : {},
    };
  } catch (error) {
    console.warn('Notes, saves and progress on this phone could not be read', error);
    return emptyUserData();
  }
}
