import { describe, expect, it } from 'vitest';
import { formatAgo, formatCount, formatDecimal, formatDuration, formatKm, formatRate } from './format';

describe('Zahlenformat de-CH', () => {
  it('trennt Tausender mit Apostroph und rundet ab', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(999)).toBe('999');
    expect(formatCount(1234.7)).toBe('1’234');
    expect(formatCount(1234567)).toBe('1’234’567');
    expect(formatCount(-1500)).toBe('-1’500');
  });

  it('schreibt Dezimalzahlen mit Komma', () => {
    expect(formatDecimal(7.5, 1)).toBe('7,5');
    expect(formatDecimal(7, 1)).toBe('7,0');
    expect(formatDecimal(1234.56, 2)).toBe('1’234,56');
  });

  it('formatiert Raten, Kilometer und Dauern', () => {
    expect(formatRate(20)).toBe('20/min');
    expect(formatRate(7.5)).toBe('7,5/min');
    expect(formatKm(6.4)).toBe('6,4 km');
    expect(formatKm(24)).toBe('24,0 km');
    expect(formatDuration(27600)).toBe('7 h 40 min');
    expect(formatDuration(7200)).toBe('2 h');
    expect(formatDuration(185)).toBe('3 min 5 s');
    expect(formatDuration(45)).toBe('45 s');
  });

  it('sagt grob, wie lange ein Zeitpunkt her ist', () => {
    const now = 10_000_000_000;
    expect(formatAgo(0, now)).toBe('unbekannt');
    expect(formatAgo(now - 20_000, now)).toBe('gerade eben');
    expect(formatAgo(now - 3 * 60_000, now)).toBe('vor 3 min');
    expect(formatAgo(now - (2 * 3600 + 10 * 60) * 1000, now)).toBe('vor 2 h 10 min');
    expect(formatAgo(now - 5 * 3600 * 1000, now)).toBe('vor 5 h');
    expect(formatAgo(now - 3 * 24 * 3600 * 1000, now)).toBe('vor 3 Tagen');
    expect(formatAgo(now + 60_000, now)).toBe('gerade eben');
  });
});
