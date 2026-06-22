// A tiny inline sparkline. Plots a series with the smallest value at the bottom, so for lap times and
// incidents a downward trend reads as "improving". Nulls break the line (a session with no data).

export function Sparkline({
  values,
  width = 160,
  height = 36,
  color = '#6aa3ff',
}: {
  values: (number | null)[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const present = values.filter((v): v is number => v != null);
  if (present.length === 0) return <svg width={width} height={height} />;

  const min = Math.min(...present);
  const max = Math.max(...present);
  const span = max - min || 1;
  const pad = 4;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const n = values.length;

  const xy = (v: number, i: number) => {
    const x = pad + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = pad + (innerH - ((v - min) / span) * innerH); // smallest value -> bottom
    return [x, y] as const;
  };

  // Build a polyline over contiguous non-null runs (a gap splits the line).
  const segments: string[] = [];
  let run: string[] = [];
  values.forEach((v, i) => {
    if (v == null) {
      if (run.length) segments.push(run.join(' '));
      run = [];
    } else {
      const [x, y] = xy(v, i);
      run.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
  });
  if (run.length) segments.push(run.join(' '));

  const lastIdx = values.map((v, i) => (v != null ? i : -1)).filter((i) => i >= 0).pop()!;
  const [lx, ly] = xy(values[lastIdx]!, lastIdx);

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {segments.map((pts, i) => (
        <polyline key={i} points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {/* dots for each session, last one emphasized */}
      {values.map((v, i) => {
        if (v == null) return null;
        const [x, y] = xy(v, i);
        const last = i === lastIdx;
        return <circle key={i} cx={x} cy={y} r={last ? 3 : 2} fill={last ? color : '#0e121b'} stroke={color} strokeWidth={1} />;
      })}
      <circle cx={lx} cy={ly} r={3} fill={color} />
    </svg>
  );
}
