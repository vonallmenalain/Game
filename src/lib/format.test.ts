import { describe, expect, it } from 'vitest';
import { formatCount, formatDecimal, formatDuration, formatKm, formatRate } from './format';

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
});
