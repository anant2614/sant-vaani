import type { Clip } from '@sant-vaani/core';

export type ClipTiming = Pick<Clip, 'youtubeId' | 'start' | 'end'>;

/**
 * YouTube's own player in privacy-enhanced mode, cued to just the clip. It
 * never starts by itself (autoplay=0), plays inside the page on iPhones,
 * and suggests only videos from the same channel when the clip ends.
 */
export function embedUrl({ youtubeId, start, end }: ClipTiming): string {
  const params = new URLSearchParams({
    start: String(start),
    end: String(end),
    autoplay: '0',
    playsinline: '1',
    rel: '0',
  });
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?${params}`;
}

/**
 * A page that holds only the player, edge to edge. It grants no autoplay
 * and no picture in picture, so nothing plays once the screen is gone, and
 * it sends its origin as the referrer, which YouTube needs to identify the
 * app.
 */
export function playerHtml(clip: ClipTiming, title: string): string {
  return [
    '<!doctype html>',
    '<html><head>',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<style>html,body{margin:0;height:100%;background:#000}iframe{display:block;width:100%;height:100%;border:0}</style>',
    '</head><body>',
    `<iframe src="${embedUrl(clip)}" title="${escapeHtml(title)}" allow="encrypted-media; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`,
    '</body></html>',
  ].join('');
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}
