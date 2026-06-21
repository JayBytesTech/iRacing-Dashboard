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
