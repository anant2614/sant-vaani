/** A clip in YouTube's own player, from its start to its end. Never autoplays. */
export function ClipPreview({ youtubeId, start, end, title }: { youtubeId: string; start: number; end: number; title: string }) {
  const src = `https://www.youtube-nocookie.com/embed/${youtubeId}?start=${start}&end=${end}&rel=0&playsinline=1`;
  return (
    <div className="player">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        allow="encrypted-media; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
