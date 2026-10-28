import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { total } from '@/lib/db';

export default async function Overview() {
  const { supabase, staff } = await requireStaff();
  const count = (table: string) => supabase.from(table).select('*', { count: 'exact', head: true });

  const [inbox, secondReview, drafts, replacements, backlog, questions, published, paths] = await Promise.all([
    count('videos').in('status', ['new', 'suggested']),
    count('clips').eq('status', 'needs_second_review'),
    count('clips').eq('status', 'draft'),
    count('answers').eq('status', 'needs_replacement'),
    count('backlog_items').eq('status', 'open').is('question_id', null),
    count('questions'),
    count('answers').eq('status', 'published'),
    count('paths').eq('published', false),
  ]).then((results) => results.map(total));

  const cards = [
    { href: '/inbox', value: inbox, label: 'Videos waiting', hint: 'New talks from the channels' },
    { href: '/review', value: secondReview, label: 'Second reviews', hint: 'Sensitive clips waiting' },
    { href: '/review?show=drafts', value: drafts, label: 'Draft clips', hint: 'Started but not approved' },
    { href: '/answers?show=replace', value: replacements, label: 'Answers to repair', hint: 'A clip went away' },
    { href: '/answers', value: questions - published, label: 'Questions without a live answer', hint: `${published} of ${questions} published` },
    { href: '/backlog', value: backlog, label: 'Asked, not yet curated', hint: 'Questions nothing matched' },
    { href: '/paths', value: paths, label: 'Paths not published', hint: 'Seven days each' },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Namaste, {staff.displayName}</h1>
          <p>What needs a person today. Nothing reaches the app until someone here has watched it.</p>
        </div>
      </div>
      <div className="grid">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="card stat">
            <strong>{card.value}</strong>
            {card.label}
            <br />
            <small>{card.hint}</small>
          </Link>
        ))}
      </div>
    </>
  );
}
