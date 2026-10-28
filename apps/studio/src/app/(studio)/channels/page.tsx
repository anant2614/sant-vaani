import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm } from '@/components/ActionForm';
import { requireStaff } from '@/lib/auth';
import { rows } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { RIGHTS } from '@/lib/forms';
import type { Channel, Saint } from '@/lib/types';
import { addChannel, setChannelActive } from './actions';

export const metadata: Metadata = { title: 'Channels' };

type Row = Channel & { saints: Pick<Saint, 'name_en' | 'name_hi'>; videos: { count: number }[] };

export default async function ChannelsPage() {
  const { supabase } = await requireStaff();
  const [channels, saints] = await Promise.all([
    supabase
      .from('channels')
      .select('*, saints!inner(name_en, name_hi), videos(count)')
      .order('title')
      .then((result) => rows<Row>(result)),
    supabase
      .from('saints')
      .select('id, name_en, name_hi')
      .order('name_en', { nullsFirst: false })
      .then((result) => rows<Pick<Saint, 'id' | 'name_en' | 'name_hi'>>(result)),
  ]);
  const rights = new Map(RIGHTS.map((r) => [r.value, r.label]));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Channels</h1>
          <p>
            Only official channels. Their uploads are the only source of clips, so views and ad income go to the
            saint.
          </p>
        </div>
      </div>
      <section className="card">
        <h2>Add a channel</h2>
        {saints.length === 0 ? (
          <p className="muted">
            <Link href="/saints">Add the saint</Link> first.
          </p>
        ) : (
          <ActionForm action={addChannel} resetOnSuccess>
            <div className="row">
              <label className="field">
                <span>Saint</span>
                <select name="saintId" required defaultValue="">
                  <option value="" disabled>
                    Choose
                  </option>
                  {saints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name_en ?? s.name_hi}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" style={{ flex: 2 }}>
                <span>Channel link or handle</span>
                <input name="ref" placeholder="https://www.youtube.com/@channel" required />
              </label>
              <label className="field">
                <span>Rights</span>
                <select name="rightsBasis" defaultValue="official_embed">
                  {RIGHTS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button type="submit">Add channel</button>
          </ActionForm>
        )}
      </section>

      {channels.length === 0 ? (
        <p className="empty" style={{ marginTop: 14 }}>
          No channels yet.
        </p>
      ) : (
        <ul className="rows" style={{ marginTop: 14 }}>
          {channels.map((channel) => (
            <li key={channel.id}>
              <div className="grow">
                <a className="title" href={`https://www.youtube.com/channel/${channel.youtube_channel_id}`} target="_blank" rel="noreferrer">
                  {channel.title || channel.youtube_channel_id}
                </a>
                <div className="meta">
                  <span>{channel.saints.name_en ?? channel.saints.name_hi}</span>
                  {channel.handle ? <span>{channel.handle}</span> : null}
                  <span>{rights.get(channel.rights_basis)}</span>
                  <span>{channel.videos[0]?.count ?? 0} videos</span>
                  <span>Last fetched {formatDate(channel.last_fetched_at)}</span>
                </div>
              </div>
              {channel.active ? <span className="badge good">Fetching</span> : <span className="badge">Paused</span>}
              <ActionForm action={setChannelActive.bind(null, channel.id, !channel.active)}>
                <button type="submit" className="quiet small">
                  {channel.active ? 'Pause' : 'Resume'}
                </button>
              </ActionForm>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
