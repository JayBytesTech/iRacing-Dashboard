import { describe, expect, it } from 'vitest';
import { polarPosition } from './trackmap';

const CX = 100;
const CY = 100;
const R = 50;

describe('polarPosition', () => {
  it('puts start/finish (pct 0) at the top', () => {
    const p = polarPosition(0, CX, CY, R);
    expect(p.x).toBeCloseTo(100, 5);
    expect(p.y).toBeCloseTo(50, 5); // top = cy - r
  });

  it('goes clockwise: a quarter lap is on the right', () => {
    const p = polarPosition(0.25, CX, CY, R);
    expect(p.x).toBeCloseTo(150, 5); // right = cx + r
    expect(p.y).toBeCloseTo(100, 5);
  });

  it('half a lap is at the bottom', () => {
    const p = polarPosition(0.5, CX, CY, R);
    expect(p.x).toBeCloseTo(100, 5);
    expect(p.y).toBeCloseTo(150, 5); // bottom = cy + r
  });

  it('three-quarters is on the left', () => {
    const p = polarPosition(0.75, CX, CY, R);
    expect(p.x).toBeCloseTo(50, 5); // left = cx - r
    expect(p.y).toBeCloseTo(100, 5);
  });

  it('wraps: pct 1 lands back at the top', () => {
    const p = polarPosition(1, CX, CY, R);
    expect(p.x).toBeCloseTo(100, 5);
    expect(p.y).toBeCloseTo(50, 5);
  });
});
