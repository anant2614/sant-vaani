import type { Metadata } from 'next';
import { ActionForm } from '@/components/ActionForm';
import { requireStaff, ROLE_LABEL, type StaffRole } from '@/lib/auth';
import { rows } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { addStaff, removeStaff, setRole } from './actions';

export const metadata: Metadata = { title: 'Staff' };

type Row = { user_id: string; role: StaffRole; display_name: string; created_at: string };

const ROLE_HELP: Record<StaffRole, string> = {
  curator: 'Cuts and approves clips, builds answers and paths.',
  reviewer: 'Also gives the second review on sensitive clips.',
  admin: 'Also manages staff and saint takedowns.',
};

export default async function StaffPage() {
  const { supabase, staff } = await requireStaff();
  const members = rows<Row>(await supabase.from('staff').select('user_id, role, display_name, created_at').order('created_at'));
  const admin = staff.role === 'admin';

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Staff</h1>
          <p>
            {(Object.keys(ROLE_HELP) as StaffRole[]).map((role) => (
              <span key={role}>
                <strong>{ROLE_LABEL[role]}:</strong> {ROLE_HELP[role]}{' '}
              </span>
            ))}
          </p>
        </div>
      </div>

      {admin ? (
        <section className="card">
          <h2>Add someone</h2>
          <p className="muted">Ask them to sign in to the studio once with their email first, then add that email here.</p>
          <ActionForm action={addStaff} resetOnSuccess>
            <div className="row">
              <label className="field">
                <span>Email</span>
                <input type="email" name="email" required />
              </label>
              <label className="field">
                <span>Name shown to others</span>
                <input name="displayName" required maxLength={80} />
              </label>
              <label className="field">
                <span>Role</span>
                <select name="role" defaultValue="curator">
                  {(Object.keys(ROLE_LABEL) as StaffRole[]).map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button type="submit">Add to staff</button>
          </ActionForm>
        </section>
      ) : null}

      <ul className="rows" style={{ marginTop: 14 }}>
        {members.map((member) => (
          <li key={member.user_id}>
            <div className="grow">
              <span className="title">
                {member.display_name}
                {member.user_id === staff.userId ? ' (you)' : ''}
              </span>
              <div className="meta">
                <span>Since {formatDate(member.created_at)}</span>
              </div>
            </div>
            {admin ? (
              <>
                <ActionForm action={setRole.bind(null, member.user_id)} className="row">
                  <select name="role" defaultValue={member.role} aria-label={`Role of ${member.display_name}`}>
                    {(Object.keys(ROLE_LABEL) as StaffRole[]).map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABEL[role]}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="secondary small">
                    Change
                  </button>
                </ActionForm>
                {member.user_id !== staff.userId ? (
                  <ActionForm action={removeStaff.bind(null, member.user_id)} confirm={`Remove ${member.display_name} from the staff?`}>
                    <button type="submit" className="danger small">
                      Remove
                    </button>
                  </ActionForm>
                ) : null}
              </>
            ) : (
              <span className="badge">{ROLE_LABEL[member.role]}</span>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
