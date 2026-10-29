import AsyncStorage from '@react-native-async-storage/async-storage';

import { createUserStore, noteFor, USER_DATA_KEY } from '@/user/localStore';
import { deleteAccount, syncUserData } from '@/user/sync';
import { fakeSupabase } from './fakeSupabase';

let ids = 0;
const NOW = new Date('2026-10-28T01:10:00.000Z');
/** A fresh copy of the app's store, reading whatever the last one saved on the phone. */
const openStore = () =>
  createUserStore({ newId: () => `00000000-0000-4000-8000-${String(++ids).padStart(12, '0')}`, clock: () => NOW });

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('a note saved offline is queued and syncs once', async () => {
  const server = fakeSupabase();
  server.setOffline(true);
  const store = openStore();
  const note = (await store.saveNote({ chapter: 2, verse: 47, body: 'Do the work; leave the fruit.' }))!;

  await expect(syncUserData(store, server.client)).rejects.toThrow('Network request failed');

  // Still waiting after the app restarts, and sent once the phone is back online.
  const reopened = openStore();
  expect((await reopened.pending()).notes).toHaveLength(1);
  server.setOffline(false);
  await syncUserData(reopened, server.client);
  await syncUserData(reopened, server.client);

  expect(server.sent('notes')).toHaveLength(1);
  expect(server.sent('notes')[0]?.payload).toEqual({
    rows: [
      {
        id: note.id,
        chapter: 2,
        verse: 47,
        body: 'Do the work; leave the fruit.',
        created_at: NOW.toISOString(),
        updated_at: NOW.toISOString(),
        deleted_at: null,
      },
    ],
    options: { onConflict: 'id' },
  });
  expect((await reopened.pending()).notes).toEqual([]);
});

test('an edited note syncs its latest text, and a deleted one syncs its deletion', async () => {
  const server = fakeSupabase();
  const store = openStore();
  const first = (await store.saveNote({ chapter: 6, verse: 35, body: 'Practice.' }))!;
  await store.saveNote({ chapter: 6, verse: 35, body: 'Practice, and let go.' });
  await syncUserData(store, server.client);

  await store.deleteNote(first.id);
  await syncUserData(store, server.client);

  const bodies = server.sent('notes').map((call) => (call.payload as { rows: { body: string; deleted_at: string | null }[] }).rows);
  expect(bodies).toEqual([
    [expect.objectContaining({ id: first.id, body: 'Practice, and let go.', deleted_at: null })],
    // The text goes; the row stays so the deletion reaches the person's other phones.
    [expect.objectContaining({ id: first.id, body: '', deleted_at: NOW.toISOString() })],
  ]);
  expect(noteFor(await store.load(), 6, 35)).toBeNull();
});

test('a note deleted before it synced never reaches the server', async () => {
  const server = fakeSupabase();
  const store = openStore();
  const note = (await store.saveNote({ chapter: 2, verse: 14, body: 'Endure.' }))!;
  await store.deleteNote(note.id);

  await syncUserData(store, server.client);

  expect(server.sent('notes')).toEqual([]);
});

test('clearing the text of a note deletes it', async () => {
  const store = openStore();
  await store.saveNote({ chapter: 2, verse: 47, body: '  First thoughts.  ' });
  expect(noteFor(await store.load(), 2, 47)?.body).toBe('First thoughts.');

  expect(await store.saveNote({ chapter: 2, verse: 47, body: '   ' })).toBeNull();

  expect(noteFor(await store.load(), 2, 47)).toBeNull();
});

test('saves sync as the last choice made on the phone', async () => {
  const server = fakeSupabase();
  const store = openStore();
  await store.setSaved('verse', '2.47', true);
  await store.setSaved('verse', '2.47', false);
  await store.setSaved('verse', '2.47', true);
  await store.setSaved('verse', '6.35', true);
  await store.setSaved('verse', '6.35', false);

  await syncUserData(store, server.client);
  await syncUserData(store, server.client);

  expect(server.sent('saves').map((call) => [call.op, call.payload])).toEqual([
    ['upsert', { rows: [{ kind: 'verse', ref: '2.47' }], options: { onConflict: 'user_id,kind,ref', ignoreDuplicates: true } }],
    ['delete', { kind: 'verse', ref: '6.35' }],
  ]);
});

test('deleting the account clears local notes', async () => {
  const server = fakeSupabase();
  const store = openStore();
  await store.saveNote({ chapter: 2, verse: 47, body: 'Mine alone.' });
  await store.setSaved('verse', '2.47', true);

  await deleteAccount(server.client, store);

  expect(server.fake.rpc).toHaveBeenCalledWith('delete_my_account');
  expect(server.fake.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  expect(await AsyncStorage.getItem(USER_DATA_KEY)).toBeNull();
  const reopened = await openStore().load();
  expect(Object.keys(reopened.notes)).toEqual([]);
  expect(Object.keys(reopened.saves)).toEqual([]);
});

test('keeps local notes when the server could not delete the account', async () => {
  const server = fakeSupabase();
  server.setOffline(true);
  const store = openStore();
  await store.saveNote({ chapter: 2, verse: 47, body: 'Still here.' });

  await expect(deleteAccount(server.client, store)).rejects.toThrow('Network request failed');

  expect(server.fake.auth.signOut).not.toHaveBeenCalled();
  expect(noteFor(await openStore().load(), 2, 47)?.body).toBe('Still here.');
});
