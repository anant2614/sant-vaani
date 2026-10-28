import { parseTimestamp } from './time.ts';

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
const HANDLE = /^@[A-Za-z0-9._-]{3,30}$/;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com']);

function toUrl(input: string): URL | null {
  try {
    return new URL(input.trim());
  } catch {
    return null;
  }
}

/** The 11-character video id from any common YouTube link, or a bare id. */
export function parseYouTubeVideoId(input: string): string | null {
  const text = input.trim();
  if (VIDEO_ID.test(text)) return text;
  const url = toUrl(text);
  if (!url) return null;
  let candidate: string | null | undefined = null;
  if (url.hostname === 'youtu.be') {
    candidate = url.pathname.split('/')[1];
  } else if (YOUTUBE_HOSTS.has(url.hostname)) {
    const [first, second] = url.pathname.split('/').filter(Boolean);
    if (first === 'watch') candidate = url.searchParams.get('v');
    else if (first === 'shorts' || first === 'embed' || first === 'live' || first === 'v') candidate = second;
  }
  return candidate && VIDEO_ID.test(candidate) ? candidate : null;
}

export type ChannelRef = { kind: 'id' | 'handle'; value: string };

/** A channel id ("UC…") or handle ("@name") from a channel link or typed text. */
export function parseChannelRef(input: string): ChannelRef | null {
  const text = input.trim();
  if (CHANNEL_ID.test(text)) return { kind: 'id', value: text };
  if (HANDLE.test(text)) return { kind: 'handle', value: text };
  const url = toUrl(text);
  if (!url || !YOUTUBE_HOSTS.has(url.hostname)) return null;
  const [first, second] = url.pathname.split('/').filter(Boolean);
  if (first === 'channel' && second && CHANNEL_ID.test(second)) return { kind: 'id', value: second };
  if (first && HANDLE.test(decodeURIComponent(first))) return { kind: 'handle', value: decodeURIComponent(first) };
  return null;
}

export type Chapter = { start: number; title: string };

const CHAPTER_LINE = /^\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s*[-–—:|]?\s+(.+?)\s*$/;

/**
 * Chapters as YouTube reads them from a description: lines that start with
 * a timestamp, the first at 0:00, at least three, in rising order.
 */
export function parseChapters(description: string): Chapter[] {
  const chapters: Chapter[] = [];
  for (const line of description.split(/\r?\n/)) {
    const match = CHAPTER_LINE.exec(line);
    if (!match) continue;
    const start = parseTimestamp(match[1] as string);
    if (start === null) continue;
    chapters.push({ start, title: match[2] as string });
  }
  if (chapters.length < 3 || chapters[0]?.start !== 0) return [];
  for (let i = 1; i < chapters.length; i++) {
    if ((chapters[i] as Chapter).start <= (chapters[i - 1] as Chapter).start) return [];
  }
  return chapters;
}

export function youtubeWatchUrl(videoId: string, startSeconds = 0): string {
  return startSeconds > 0
    ? `https://www.youtube.com/watch?v=${videoId}&t=${startSeconds}s`
    : `https://www.youtube.com/watch?v=${videoId}`;
}
