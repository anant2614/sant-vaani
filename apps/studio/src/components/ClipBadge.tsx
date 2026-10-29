import { notLiveReason } from '@/lib/clips';
import type { ClipCard } from '@/lib/types';

/** "Live", or why the clip is not in the app. */
export function ClipBadge({ clip }: { clip: ClipCard }) {
  const reason = notLiveReason(clip);
  if (!reason) return <span className="badge good">Live</span>;
  const tone = clip.status === 'draft' || clip.status === 'needs_second_review' ? 'wait' : 'bad';
  return <span className={`badge ${tone}`}>{reason}</span>;
}
