import { describe, expect, it } from 'vitest';
import { createInitialState } from '../engine';
import { buildCloudSave, decideSync, type CloudSave } from './sync';

function cloud(playedSeconds: number, km = 0): CloudSave {
  return { json: '{}', playedSeconds, km, version: 1, aktualisiert: 0, geraet: 'Android' };
}

function local(playedSeconds: number, km = 0) {
  const s = createInitialState();
  s.playedSeconds = playedSeconds;
  s.km = km;
  return s;
}

describe('Abgleich zwischen Gerät und Cloud', () => {
  it('lädt hoch, wenn in der Cloud nichts liegt', () => {
    expect(decideSync(local(500), null)).toEqual({ kind: 'hochladen', grund: 'cloud_leer' });
  });

  it('lädt herunter, wenn auf dem Gerät nichts liegt', () => {
    expect(decideSync(null, cloud(500))).toEqual({ kind: 'herunterladen', grund: 'lokal_leer' });
  });

  it('tut nichts, wenn beide Seiten fehlen oder gleich weit sind', () => {
    expect(decideSync(null, null)).toEqual({ kind: 'nichts' });
    expect(decideSync(local(500), cloud(500))).toEqual({ kind: 'nichts' });
    expect(decideSync(local(500), cloud(540))).toEqual({ kind: 'nichts' });
    expect(decideSync(local(540), cloud(500))).toEqual({ kind: 'nichts' });
  });

  it('fragt nach, wenn die Cloud deutlich weiter ist', () => {
    const decision = decideSync(local(300, 2), cloud(3600, 12));
    expect(decision.kind).toBe('fragen');
    if (decision.kind === 'fragen') {
      expect(decision.lokal.playedSeconds).toBe(300);
      expect(decision.cloud.km).toBe(12);
    }
  });

  it('lädt ungefragt hoch, wenn das Gerät weiter ist: dabei geht nichts verloren', () => {
    expect(decideSync(local(3600), cloud(300))).toEqual({ kind: 'hochladen', grund: 'lokal_weiter' });
  });
});

describe('Das Dokument für die Cloud', () => {
  it('trägt genau die Felder, die die Regeln erlauben', () => {
    const state = local(1234.6, 18.456);
    const dokument = buildCloudSave('{"a":1}', state, 1_700_000_000_000, 'Mac');
    expect(Object.keys(dokument).sort()).toEqual(['aktualisiert', 'geraet', 'json', 'km', 'playedSeconds', 'version']);
    expect(dokument.playedSeconds).toBe(1235);
    expect(dokument.km).toBe(18.46);
    expect(dokument.version).toBe(state.version);
    expect(dokument.aktualisiert).toBe(1_700_000_000_000);
    expect(dokument.geraet).toBe('Mac');
  });
});
