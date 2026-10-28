/** 161 → "2:41", 3723 → "1:02:03". */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`;
  return `${m}:${ss}`;
}

/** Reads "45", "2:41" or "1:02:03" into seconds; anything else is null. */
export function parseTimestamp(input: string): number | null {
  const text = input.trim();
  if (!/^\d+(:\d{1,2}){0,2}$/.test(text)) return null;
  const parts = text.split(':').map(Number);
  if (parts.slice(1).some((p) => p > 59)) return null;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

/** YouTube's ISO 8601 durations, such as "PT1H2M3S" or "P1DT2H". */
export function parseIsoDuration(iso: string): number {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso.trim());
  if (!match) return 0;
  const [, d = '0', h = '0', m = '0', s = '0'] = match;
  return Number(d) * 86_400 + Number(h) * 3600 + Number(m) * 60 + Number(s);
}
