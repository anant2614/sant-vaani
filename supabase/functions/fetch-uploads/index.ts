// Nightly: new uploads from every allowlisted channel go into the studio inbox.
import { videoColumns } from '../_shared/core/index.ts';
import { check, rows } from '../_shared/db.ts';
import { serveJob } from '../_shared/jobs.ts';
import { youtubeClient } from '../_shared/youtube.ts';
import { collectNewUploads, usableUploads } from './uploads.ts';

type Channel = { id: string; title: string; uploads_playlist_id: string };

serveJob('fetch-uploads', async (db) => {
  const youtube = youtubeClient();
  const channels = rows<Channel>(
    await db.from('channels').select('id, title, uploads_playlist_id').eq('active', true).order('created_at'),
    'reading channels',
  );

  let added = 0;
  const failed: string[] = [];
  for (const channel of channels) {
    try {
      const ids = await collectNewUploads(
        (pageToken) => youtube.listUploads(channel.uploads_playlist_id, pageToken),
        async (ids) => {
          const known = rows<{ youtube_id: string }>(
            await db.from('videos').select('youtube_id').in('youtube_id', ids),
            'reading known videos',
          );
          return new Set(known.map((v) => v.youtube_id));
        },
      );
      const now = new Date();
      const videos = ids.length > 0 ? usableUploads(await youtube.getVideos(ids)) : [];
      if (videos.length > 0) {
        check(
          await db
            .from('videos')
            .upsert(
              videos.map((v) => ({ channel_id: channel.id, youtube_id: v.youtubeId, ...videoColumns(v, now) })),
              { onConflict: 'youtube_id', ignoreDuplicates: true },
            ),
          'saving videos',
        );
        added += videos.length;
      }
      check(
        await db.from('channels').update({ last_fetched_at: now.toISOString() }).eq('id', channel.id),
        'updating the channel',
      );
    } catch (error) {
      // One channel failing, say one that was deleted, does not stop the others.
      failed.push(`${channel.title}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { channels: channels.length, added, failed };
});
