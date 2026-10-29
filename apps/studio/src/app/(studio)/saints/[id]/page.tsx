import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ActionForm } from '@/components/ActionForm';
import { requireStaff } from '@/lib/auth';
import { row, rows } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { RIGHTS } from '@/lib/forms';
import type { Channel, Saint } from '@/lib/types';
import { setTakedown, updateSaint } from '../actions';
import { SaintFields } from '../SaintFields';

export const metadata: Metadata = { title: 'Saint' };

export default async function SaintPage({ params }: PageProps<'/saints/[id]'>) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase, staff } = await requireStaff();

  const [saint, channels] = await Promise.all([
    supabase
      .from('saints')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then((result) => row<Saint>(result)),
    supabase
      .from('channels')
      .select('*')
      .eq('saint_id', id)
      .order('title')
      .then((result) => rows<Channel>(result)),
  ]);
  if (!saint) notFound();
  const rights = new Map(RIGHTS.map((r) => [r.value, r.label]));

  return (
    <>
      <p>
        <Link href="/saints">← All saints</Link>
      </p>
      <div className="page-head">
        <div>
          <h1>{saint.name_en ?? saint.name_hi}</h1>
          {saint.taken_down ? <span className="badge bad">Taken down {formatDate(saint.taken_down_at)}</span> : null}
        </div>
      </div>
      <div className="split">
        <section className="card">
          <h2>Details</h2>
          <ActionForm action={updateSaint.bind(null, saint.id)}>
            <SaintFields saint={saint} />
            <button type="submit">Save</button>
          </ActionForm>
        </section>
        <div className="stack">
          <section className="card">
            <h2>Channels</h2>
            {channels.length === 0 ? (
              <p className="muted">
                No channels yet. <Link href="/channels">Add the official channel</Link>.
              </p>
            ) : (
              <ul className="timeline">
                {channels.map((c) => (
                  <li key={c.id}>
                    <span className="grow">
                      {c.title} {c.handle ? <small>{c.handle}</small> : null}
                      <br />
                      <small>{rights.get(c.rights_basis)}</small>
                    </span>
                    {c.active ? null : <span className="badge">Paused</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="card">
            <h2>Takedown</h2>
            <p className="muted">
              If the saint or their team asks us to remove their clips, this hides every one of them from the app and
              flags the answers that used them.
            </p>
            {staff.role === 'admin' ? (
              saint.taken_down ? (
                <ActionForm action={setTakedown.bind(null, saint.id, false)} confirm="Restore all of this saint's clips?">
                  <button type="submit" className="secondary">
                    Restore clips
                  </button>
                </ActionForm>
              ) : (
                <ActionForm action={setTakedown.bind(null, saint.id, true)} confirm="Hide every clip of this saint from the app?">
                  <button type="submit" className="danger">
                    Take down all clips
                  </button>
                </ActionForm>
              )
            ) : (
              <p>Only an admin can do this.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
