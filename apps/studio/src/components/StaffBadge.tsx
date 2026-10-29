import { signOut } from '@/app/actions';
import { ROLE_LABEL, requireStaff } from '@/lib/auth';

export async function StaffBadge() {
  const { staff } = await requireStaff();
  return (
    <div className="whoami">
      <span>
        {staff.displayName} · {ROLE_LABEL[staff.role]}
      </span>
      <form action={signOut}>
        <button type="submit" className="quiet small">
          Sign out
        </button>
      </form>
    </div>
  );
}
