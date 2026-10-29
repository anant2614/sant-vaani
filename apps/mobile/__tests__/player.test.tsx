import { render, screen } from '@testing-library/react-native';

import { ClipPlayer } from '@/player/ClipPlayer';
import { embedUrl } from '@/player/embed';

const CLIP = { youtubeId: 'aaaaaaaaaa1', start: 600, end: 750 };

test('player never autoplays', async () => {
  await render(<ClipPlayer clip={CLIP} title="Sample Saint A" />);

  const player = screen.getByTestId('youtube-player');
  expect(player.props.mediaPlaybackRequiresUserAction).toBe(true);
  expect(player.props.source.html).toContain('autoplay=0');
  expect(player.props.source.html).not.toMatch(/autoplay=1|allow="[^"]*autoplay/);
});

test("the embed uses YouTube's own player for just the clip", () => {
  const url = new URL(embedUrl(CLIP));

  expect(url.origin + url.pathname).toBe('https://www.youtube-nocookie.com/embed/aaaaaaaaaa1');
  expect(Object.fromEntries(url.searchParams)).toEqual({
    start: '600',
    end: '750',
    autoplay: '0',
    playsinline: '1',
    rel: '0',
  });
});

test('the player is never smaller than 200 points', async () => {
  await render(<ClipPlayer clip={CLIP} title="Sample Saint A" />);

  const style = [screen.getByTestId('youtube-player').props.style].flat(Infinity);
  expect(style).toEqual(expect.arrayContaining([expect.objectContaining({ minHeight: 200, minWidth: 200 })]));
});
