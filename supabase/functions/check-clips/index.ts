// Nightly: re-check every live clip's video and refresh stored YouTube data.
// A clip whose video went private, was deleted or stopped allowing embeds
// is retired, which flags its answers for a replacement.
import { allRows, check, eachLimited } from '../_shared/db.ts';
import { serveJob } from '../_shared/jobs.ts';
import { youtubeClient } from '../_shared/youtube.ts';
import { planClipChecks, videosToCheck, type StoredVideo } from './plan.ts';

/** More missing videos than this looks like a YouTube fault, not a wave of deletions. */
const MAX_MISSING_SHARE = 0.1;
const MAX_MISSING_ALWAYS_OK = 5;

serveJob('check-clips', async (db) => {
  const youtube = youtubeClient();
  const now = new Date();
  const stored = await allRows<StoredVideo>(
    (from, to) => db.from('videos').select('id, youtube_id, fetched_at, privacy_status, clips(id, status)').order('id').range(from, to),
    'reading videos',
  );
  const due = videosToCheck(stored, now);
  const plan = planClipChecks(due, await youtube.getVideos(due.map((v) => v.youtubeId)), now);

  if (plan.missing > Math.max(MAX_MISSING_ALWAYS_OK, due.length * MAX_MISSING_SHARE)) {
    throw new Error(
      `YouTube left out ${plan.missing} of ${due.length} videos, far more than on a normal night, so nothing was changed. If they really were removed, retire their clips in the studio.`,
    );
  }

  await eachLimited(plan.refresh, 10, async ({ id, columns }) => {
    check(await db.from('videos').update(columns).eq('id', id), 'refreshing a video');
  });
  for (const { clipId, reason } of plan.retire) {
    check(await db.rpc('retire_clip', { clip_id: clipId, reason }), 'retiring a clip');
  }
  return { checked: due.length, refreshed: plan.refresh.length, missing: plan.missing, retired: plan.retire.length };
});
