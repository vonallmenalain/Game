import { describe, expect, it } from 'vitest';
import { deserialize, fillDefaults, serialize } from './save';
import { createInitialState } from './state';
import { addWagon, grant, research, runFor } from './sim/testkit';

describe('Speichern und Laden', () => {
  it('serialisiert und lädt denselben Zustand', () => {
    const s = createInitialState();
    research(s, 'selbstlader', 'schmelzwagen');
    grant(s, { kohle: 80, schienen: 30 });
    addWagon(s, 'schmelz', { recipe: 'koks' });
    runFor(s, 120);
    const json = serialize(s, 1234567);
    const loaded = deserialize(json);
    const { warnings: _w, ...expected } = { ...s, lastSavedAt: 1234567 };
    const { warnings: _l, ...actual } = loaded;
    expect(actual).toEqual(expected);
    runFor(s, 60);
    runFor(loaded, 60);
    expect(loaded.store).toEqual(s.store);
  });

  it('ergänzt fehlende Felder aus dem Startzustand', () => {
    const loaded = fillDefaults({ version: 1, store: { kohle: 5 }, wagons: [{ type: 'ernte', resource: 'kohle' }, 'kaputt', { level: 3 }] });
    expect(loaded.store['kohle']).toBe(5);
    expect(loaded.store['eisenerz']).toBe(0);
    expect(loaded.wagons).toHaveLength(1);
    expect(loaded.wagons[0]?.resource).toBe('kohle');
    expect(loaded.nextWagonId).toBe(2);
    expect(loaded.projects['bruecke']?.done).toBe(false);
    expect(loaded.discoveredBiomes).toContain('tal');
    expect(loaded.techs.current).toBeNull();
  });

  it('hebt ältere Versionen auf die aktuelle an', () => {
    const loaded = deserialize(JSON.stringify({ version: 0, playedSeconds: 42, pos: 250 }));
    expect(loaded.version).toBe(1);
    expect(loaded.playedSeconds).toBe(42);
    expect(loaded.km).toBeCloseTo(2.5);
  });

  it('lehnt Unsinn ab', () => {
    expect(() => deserialize('[]')).toThrow();
    expect(() => deserialize('nicht json')).toThrow();
  });
});
