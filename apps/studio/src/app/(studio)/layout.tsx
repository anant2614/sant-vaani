import Link from 'next/link';
import { Suspense } from 'react';
import { NavLinks } from '@/components/NavLinks';
import { StaffBadge } from '@/components/StaffBadge';

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="topbar">
        <Link href="/" className="brand">
          Curator Studio<span>Sant Vaani</span>
        </Link>
        <NavLinks />
        <Suspense fallback={<span className="whoami">…</span>}>
          <StaffBadge />
        </Suspense>
      </header>
      <main className="page">{children}</main>
    </>
  );
}
