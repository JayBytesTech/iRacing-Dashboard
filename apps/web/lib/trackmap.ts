// Pure geometry for the v0 track map. v0 is intentionally topological, not geographically accurate:
// we place each car on a circle by its lap-distance percentage. Start/finish sits at the top (12
// o'clock) and cars travel clockwise, matching how lapDistPct increases 0 -> 1.

export interface Point {
  x: number;
  y: number;
}

/**
 * Position for a given lap-distance fraction on a circle of radius `r` centered at (cx, cy).
 * pct 0 -> top, 0.25 -> right, 0.5 -> bottom, 0.75 -> left (clockwise).
 */
export function polarPosition(pct: number, cx: number, cy: number, r: number): Point {
  const angle = pct * 2 * Math.PI - Math.PI / 2; // -90deg puts pct 0 at the top
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}
