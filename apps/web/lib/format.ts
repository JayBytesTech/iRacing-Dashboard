// Small display helpers. Keep formatting out of components so "—" for missing data is consistent.

export const DASH = '—';

export function num(value: number | null | undefined, digits = 0): string {
  return value == null ? DASH : value.toFixed(digits);
}

/** Seconds -> H:MM:SS (or M:SS under an hour). */
export function clock(totalSec: number | null | undefined): string {
  if (totalSec == null || totalSec < 0) return DASH;
  const s = Math.floor(totalSec % 60);
  const m = Math.floor((totalSec / 60) % 60);
  const h = Math.floor(totalSec / 3600);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/** Signed litres, e.g. +5.0 / -10.8 — sign carries meaning in the fuel delta. */
export function signedLiters(value: number | null | undefined): string {
  if (value == null) return DASH;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}`;
}

/** Lap time in seconds -> M:SS.s (or S.ss under a minute). */
export function lapTime(sec: number | null | undefined): string {
  if (sec == null || sec <= 0) return DASH;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${s.toFixed(1).padStart(4, '0')}` : s.toFixed(2);
}

/** Signed relative gap in seconds, e.g. +3.2 / -1.5. */
export function gap(sec: number | null | undefined): string {
  if (sec == null) return DASH;
  return `${sec >= 0 ? '+' : '-'}${Math.abs(sec).toFixed(1)}`;
}

// Accent colour per car class — used to tint leaderboard/relative rows by class.
const CLASS_COLORS: Record<string, string> = {
  GTP: '#5cc8ff',
  LMP2: '#c98cff',
  GT3: '#ffb454',
  GT4: '#9be564',
};
export function classColor(className: string | null | undefined): string {
  return (className && CLASS_COLORS[className]) || '#8a90a0';
}
