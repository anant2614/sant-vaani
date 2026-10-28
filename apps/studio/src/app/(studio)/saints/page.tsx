import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm } from '@/components/ActionForm';
import { requireStaff } from '@/lib/auth';
import { rows } from '@/lib/db';
import type { Saint } from '@/lib/types';
import { createSaint } from './actions';
import { SaintFields } from './SaintFields';

export const metadata: Metadata = { title: 'Saints' };

type Row = Saint & { channels: { count: number }[]; clips: { count: number }[] };

export default async function SaintsPage() {
  const { supabase } = await requireStaff();
  const saints = rows<Row>(
    await supabase.from('saints').select('*, channels(count), clips(count)').order('name_en', { nullsFirst: false }),
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Saints</h1>
          <p>Every clip belongs to a saint through their official channel. A takedown hides all of a saint’s clips at once.</p>
        </div>
      </div>
      <details className="card">
        <summary>Add a saint</summary>
        <ActionForm action={createSaint}>
          <SaintFields />
          <button type="submit">Add saint</button>
        </ActionForm>
      </details>
      {saints.length === 0 ? (
        <p className="empty">No saints yet.</p>
      ) : (
        <ul className="rows" style={{ marginTop: 14 }}>
          {saints.map((saint) => (
            <li key={saint.id}>
              <span className="avatar">{saint.initials}</span>
              <div className="grow">
                <Link className="title" href={`/saints/${saint.id}`}>
                  {saint.name_en ?? saint.name_hi}
                </Link>
                <div className="meta">
                  {saint.name_en && saint.name_hi ? <span className="hindi">{saint.name_hi}</span> : null}
                  {saint.tradition ? <span>{saint.tradition}</span> : null}
                  <span>{saint.channels[0]?.count ?? 0} channels</span>
                  <span>{saint.clips[0]?.count ?? 0} clips</span>
                </div>
              </div>
              {saint.taken_down ? <span className="badge bad">Taken down</span> : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
