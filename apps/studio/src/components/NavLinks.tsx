'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Overview' },
  { href: '/inbox', label: 'Inbox' },
  { href: '/review', label: 'Review' },
  { href: '/answers', label: 'Answers' },
  { href: '/paths', label: 'Paths' },
  { href: '/backlog', label: 'Backlog' },
  { href: '/saints', label: 'Saints' },
  { href: '/channels', label: 'Channels' },
  { href: '/staff', label: 'Staff' },
];

export function NavLinks() {
  const pathname = usePathname();
  const current = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <nav className="nav" aria-label="Studio">
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} aria-current={current(link.href) ? 'page' : undefined}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
