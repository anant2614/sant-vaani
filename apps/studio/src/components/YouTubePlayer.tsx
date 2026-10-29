'use client';

import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';

/** What the clip editor needs from the player. */
export type PlayerHandle = {
  currentTime(): number;
  seekTo(seconds: number): void;
};

// The parts of YouTube's IFrame Player API used here.
type YTPlayer = {
  getCurrentTime(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  destroy(): void;
};
type YTNamespace = {
  Player: new (
    element: HTMLElement,
    options: { videoId: string; host?: string; playerVars?: Record<string, number | string> },
  ) => YTPlayer;
};
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let api: Promise<YTNamespace> | null = null;

function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  api ??= new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT as YTNamespace);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.append(script);
  });
  return api;
}

/** YouTube's player with a handle for reading the time and seeking. */
export function YouTubePlayer({ videoId, ref }: { videoId: string; ref: Ref<PlayerHandle> }) {
  const mount = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);

  useEffect(() => {
    let cancelled = false;
    const host = document.createElement('div');
    mount.current?.append(host);
    loadApi().then((YT) => {
      if (cancelled) return;
      player.current = new YT.Player(host, {
        videoId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: { rel: 0, playsinline: 1 },
      });
    });
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
      host.remove();
    };
  }, [videoId]);

  useImperativeHandle(
    ref,
    () => ({
      currentTime: () => Math.floor(player.current?.getCurrentTime() ?? 0),
      seekTo: (seconds) => {
        player.current?.seekTo(seconds, true);
        player.current?.playVideo();
      },
    }),
    [],
  );

  return <div className="player" ref={mount} />;
}
