import { describe, expect, it } from 'vitest';
import { createInitialState } from '../engine';
import { buildCloudSave, decideSync, deviceName, type CloudSave, type SyncMark } from './sync';

function cloud(playedSeconds: number, km = 0, aktualisiert = 1_000): CloudSave {
  return { json: '{}', playedSeconds, km, version: 1, aktualisiert, geraet: 'Windows' };
}

function local(playedSeconds: number, km = 0, lastSavedAt = 500) {
  const s = createInitialState();
  s.playedSeconds = playedSeconds;
  s.km = km;
  s.lastSavedAt = lastSavedAt;
  return s;
}

function mark(stamp: number | null, playedSeconds: number, catchUpSeconds = 0): SyncMark {
  return { stamp, playedSeconds, catchUpSeconds };
}

describe('Abgleich zwischen Gerät und Cloud', () => {
  it('lädt hoch, wenn in der Cloud nichts liegt', () => {
    expect(decideSync(local(500), null, null)).toEqual({ kind: 'hochladen', grund: 'cloud_leer' });
    expect(decideSync(local(500), null, mark(null, 400))).toEqual({ kind: 'hochladen', grund: 'cloud_leer' });
  });

  it('lädt herunter, wenn auf dem Gerät nichts liegt', () => {
    expect(decideSync(null, cloud(500), null)).toEqual({ kind: 'herunterladen', grund: 'lokal_leer' });
    expect(decideSync(null, null, null)).toEqual({ kind: 'nichts' });
  });

  describe('wenn die Cloud noch den Stand vom letzten Abgleich trägt', () => {
    it('tut nichts, solange beide gleich weit sind', () => {
      expect(decideSync(local(500), cloud(500), mark(1_000, 500))).toEqual({ kind: 'nichts' });
      expect(decideSync(local(540), cloud(500), mark(1_000, 500))).toEqual({ kind: 'nichts' });
    });

    it('lädt hoch, was hier weiterging, auch nach einer Nachsimulation', () => {
      expect(decideSync(local(3600), cloud(500), mark(1_000, 500))).toEqual({ kind: 'hochladen', grund: 'lokal_weiter' });
      expect(decideSync(local(500 + 8 * 3600), cloud(500), mark(1_000, 500, 8 * 3600))).toEqual({ kind: 'hochladen', grund: 'lokal_weiter' });
    });

    it('holt die Cloud zurück, wenn der Stand auf dem Gerät hinter den Merkzettel gefallen ist', () => {
      // Der lokale Spielstand ging verloren, das Gerät startet frisch: Die Cloud hat das Original
      expect(decideSync(local(5), cloud(5000), mark(1_000, 5000))).toEqual({ kind: 'herunterladen', grund: 'lokal_zurueck' });
    });

    it('lässt einen Neuanfang gelten, wenn der Merkzettel ihn kennt', () => {
      // «Neu anfangen» setzt die Spielzeit im Merkzettel auf null: Die Cloud folgt, statt zurückzukommen
      expect(decideSync(local(20), cloud(5000), mark(1_000, 0))).toEqual({ kind: 'hochladen', grund: 'lokal_neu' });
    });
  });

  describe('wenn inzwischen ein anderes Gerät geschrieben hat', () => {
    it('übernimmt die Cloud ohne Rückfrage, wenn hier seit dem letzten Abgleich nichts gespielt wurde', () => {
      expect(decideSync(local(5000), cloud(9000, 40, 2_000), mark(1_000, 5000))).toEqual({ kind: 'herunterladen', grund: 'cloud_neuer' });
    });

    it('lässt sich von der Nachsimulation nicht täuschen: das Handy nach der Nacht überschreibt den PC nicht', () => {
      // Das Szenario aus dem Fehlerbericht: Das Handy hat bei 5000 s zuletzt abgeglichen, dann wurde am
      // PC bis 9000 s gespielt. Beim Öffnen holt das Handy acht Stunden nach und steht bei 33 800 s.
      // Nach Spielzeit sähe es weiter aus als die Cloud. Gespielt wurde hier aber nichts.
      const handy = local(5000 + 8 * 3600, 60);
      const pc = cloud(9000, 40, 2_000);
      expect(decideSync(handy, pc, mark(1_000, 5000, 8 * 3600))).toEqual({ kind: 'herunterladen', grund: 'cloud_neuer' });
    });

    it('übernimmt die Cloud auch, wenn die Cloud nach Spielzeit hinten liegt, aber hier nichts gespielt wurde', () => {
      // Etwa nach einem Neuanfang auf dem anderen Gerät: Dort wurde entschieden, hier nicht
      expect(decideSync(local(5000), cloud(30, 0, 2_000), mark(1_000, 5000))).toEqual({ kind: 'herunterladen', grund: 'cloud_neuer' });
    });

    it('fragt nach, wenn beide Seiten etwas haben, das der anderen fehlt', () => {
      const decision = decideSync(local(5300, 22, 700), cloud(9000, 40, 2_000), mark(1_000, 5000));
      expect(decision.kind).toBe('fragen');
      if (decision.kind !== 'fragen') return;
      expect(decision.lokal).toEqual({ playedSeconds: 5300, km: 22, savedAt: 700, geraet: deviceName() });
      expect(decision.cloud).toEqual({ playedSeconds: 9000, km: 40, savedAt: 2_000, geraet: 'Windows' });
      expect(decision.empfehlung).toBe('cloud');
    });

    it('empfiehlt das Gerät, wenn es nach Spielzeit weiter ist', () => {
      const decision = decideSync(local(12000, 50), cloud(9000, 40, 2_000), mark(1_000, 5000));
      expect(decision.kind).toBe('fragen');
      if (decision.kind === 'fragen') expect(decision.empfehlung).toBe('lokal');
    });
  });

  describe('auf einem Gerät ohne Merkzettel, etwa direkt nach dem Anmelden', () => {
    it('übernimmt die Cloud, wenn hier noch kaum gespielt wurde', () => {
      expect(decideSync(local(30), cloud(9000), null)).toEqual({ kind: 'herunterladen', grund: 'cloud_neuer' });
    });

    it('fragt nach, wenn hier schon ein eigenes Spiel läuft', () => {
      const decision = decideSync(local(3000, 12), cloud(9000, 40), null);
      expect(decision.kind).toBe('fragen');
      if (decision.kind === 'fragen') expect(decision.empfehlung).toBe('cloud');
    });

    it('fragt auch, wenn die Cloud hinten liegt: kein Stand geht ungefragt verloren', () => {
      const decision = decideSync(local(9000, 40), cloud(3000, 12), null);
      expect(decision.kind).toBe('fragen');
      if (decision.kind === 'fragen') expect(decision.empfehlung).toBe('lokal');
    });
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

  it('gilt nach dem Schreiben als der Stand, auf dem das Gerät aufbaut', () => {
    const state = local(1234.6, 18.456);
    const dokument = buildCloudSave('{"a":1}', state, 1_700_000_000_000, 'Mac');
    const merkzettel = mark(dokument.aktualisiert, dokument.playedSeconds);
    expect(decideSync(state, dokument, merkzettel)).toEqual({ kind: 'nichts' });
  });
});
