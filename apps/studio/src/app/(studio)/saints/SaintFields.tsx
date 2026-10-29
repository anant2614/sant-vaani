import type { Saint } from '@/lib/types';

export function SaintFields({ saint }: { saint?: Saint }) {
  return (
    <>
      <div className="row">
        <label className="field">
          <span>Name in English</span>
          <input name="nameEn" defaultValue={saint?.name_en ?? ''} placeholder="Swami …" />
        </label>
        <label className="field">
          <span>Name in Hindi</span>
          <input name="nameHi" className="hindi" lang="hi" defaultValue={saint?.name_hi ?? ''} />
        </label>
        <label className="field" style={{ maxWidth: 120 }}>
          <span>Initials</span>
          <input name="initials" defaultValue={saint?.initials ?? ''} maxLength={3} required />
        </label>
      </div>
      <label className="field">
        <span>Tradition</span>
        <input name="tradition" defaultValue={saint?.tradition ?? ''} placeholder="Vedanta, Bhakti, …" />
      </label>
      <label className="field">
        <span>About, in English</span>
        <textarea name="bioEn" defaultValue={saint?.bio_en ?? ''} rows={3} />
      </label>
      <label className="field">
        <span>About, in Hindi</span>
        <textarea name="bioHi" className="hindi" lang="hi" defaultValue={saint?.bio_hi ?? ''} rows={3} />
      </label>
    </>
  );
}
