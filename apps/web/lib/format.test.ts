import { describe, expect, it } from 'vitest';
import { DASH, clock, gap, lapTime, num, signedLiters, classColor } from './format';

describe('num', () => {
  it('formats to the requested precision', () => {
    expect(num(3.14159, 2)).toBe('3.14');
    expect(num(42)).toBe('42');
  });
  it('returns a dash for nullish values', () => {
    expect(num(null)).toBe(DASH);
    expect(num(undefined)).toBe(DASH);
  });
});

describe('clock', () => {
  it('formats under an hour as M:SS', () => {
    expect(clock(125)).toBe('2:05');
  });
  it('formats an hour or more as H:MM:SS', () => {
    expect(clock(3661)).toBe('1:01:01');
  });
  it('returns a dash for nullish or negative', () => {
    expect(clock(null)).toBe(DASH);
    expect(clock(-5)).toBe(DASH);
  });
});

describe('lapTime', () => {
  it('formats over a minute as M:SS.s with zero padding', () => {
    expect(lapTime(105.2)).toBe('1:45.2');
    expect(lapTime(91.4)).toBe('1:31.4');
    expect(lapTime(60.0)).toBe('1:00.0');
  });
  it('formats under a minute as S.ss', () => {
    expect(lapTime(45.21)).toBe('45.21');
  });
  it('returns a dash for nullish or non-positive', () => {
    expect(lapTime(null)).toBe(DASH);
    expect(lapTime(0)).toBe(DASH);
  });
});

describe('gap', () => {
  it('shows an explicit sign on both directions', () => {
    expect(gap(3.2)).toBe('+3.2');
    expect(gap(-1.5)).toBe('-1.5');
    expect(gap(0)).toBe('+0.0');
  });
  it('returns a dash for nullish', () => {
    expect(gap(null)).toBe(DASH);
  });
});

describe('signedLiters', () => {
  it('prefixes a plus only when positive', () => {
    expect(signedLiters(5)).toBe('+5.0');
    expect(signedLiters(-10.8)).toBe('-10.8');
  });
});

describe('classColor', () => {
  it('maps known classes and falls back for unknown/null', () => {
    expect(classColor('GTP')).toBe('#5cc8ff');
    expect(classColor('GT3')).toBe('#ffb454');
    expect(classColor('UNKNOWN')).toBe('#8a90a0');
    expect(classColor(null)).toBe('#8a90a0');
  });
});
