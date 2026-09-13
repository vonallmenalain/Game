import { describe, expect, it } from 'vitest';
import { createInitialState } from '../engine';
import { elapsedSinceSave, withTimeout } from './game.svelte';

describe('Verstrichene Zeit seit dem Speichern', () => {
  it('zählt ab dem letzten Speichern', () => {
    const s = createInitialState();
    s.lastSavedAt = 1_000_000;
    expect(elapsedSinceSave(s, 1_000_000 + 3600_000)).toBe(3600);
  });

  it('ist null bei einem frischen Spiel und bei einer Uhr, die zurückspringt', () => {
    const s = createInitialState();
    expect(elapsedSinceSave(s, Date.now())).toBe(0);
    s.lastSavedAt = 2_000_000;
    expect(elapsedSinceSave(s, 1_000_000)).toBe(0);
  });
});

describe('Warten mit Zeitlimit', () => {
  it('liefert das Ergebnis, wenn es rechtzeitig kommt', async () => {
    await expect(withTimeout(Promise.resolve('cloud'), 50)).resolves.toBe('cloud');
  });

  it('gibt nach Ablauf auf, und ein späterer Fehler stört nicht', async () => {
    const nie = new Promise<string>(() => {});
    await expect(withTimeout(nie, 10)).resolves.toBeUndefined();
    await expect(withTimeout(Promise.reject(new Error('weg')), 50)).resolves.toBeUndefined();
  });
});
