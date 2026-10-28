import type { SupabaseClient } from '@supabase/supabase-js';

import type { UserStore } from './localStore';

type Reply = { error: { message: string } | null };

function check({ error }: Reply, what: string) {
  if (error) throw new Error(`Could not ${what}: ${error.message}`);
}

/**
 * Sends the notes and saves the server has not seen. Notes go by id, so
 * sending one twice is harmless; anything that fails stays pending for the
 * next try. This phone is the only one a guest has, so nothing comes back
 * down yet.
 */
export async function syncUserData(store: UserStore, client: SupabaseClient): Promise<{ notes: number; saves: number }> {
  const { notes, saves } = await store.pending();

  if (notes.length > 0) {
    const rows = notes.map((note) => ({
      id: note.id,
      chapter: note.chapter,
      verse: note.verse,
      body: note.body,
      created_at: note.createdAt,
      updated_at: note.updatedAt,
      deleted_at: note.deletedAt,
    }));
    check(await client.from('notes').upsert(rows, { onConflict: 'id' }), 'sync notes');
    await store.markSynced({ notes: notes.map(({ id, revision }) => ({ id, revision })) });
  }

  const added = saves.filter((save) => save.saved);
  if (added.length > 0) {
    const rows = added.map(({ kind, ref }) => ({ kind, ref }));
    check(await client.from('saves').upsert(rows, { onConflict: 'user_id,kind,ref', ignoreDuplicates: true }), 'sync saves');
    await store.markSynced({ saves: added });
  }
  for (const removed of saves.filter((save) => !save.saved)) {
    check(await client.from('saves').delete().match({ kind: removed.kind, ref: removed.ref }), 'sync saves');
    await store.markSynced({ saves: [removed] });
  }

  return { notes: notes.length, saves: saves.length };
}

/**
 * Deletes the guest account on the server, which erases its profile,
 * notes, saves and questions, then everything this phone kept for it.
 * Without a connection it fails and keeps the notes, so nothing is lost
 * by a deletion that did not happen.
 */
export async function deleteAccount(client: SupabaseClient | null, store: UserStore): Promise<void> {
  const session = client ? (await client.auth.getSession()).data.session : null;
  if (client && session) {
    check(await client.rpc('delete_my_account'), 'delete the account');
    // The account is gone, so only this phone's copy of the session is left to forget.
    await client.auth.signOut({ scope: 'local' });
  }
  await store.clear();
}
