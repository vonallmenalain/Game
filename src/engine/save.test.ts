import { describe, expect, it } from 'vitest';
import { deserialize, fillDefaults, serialize } from './save';
import { BALANCE } from './balance';
import { STATE_VERSION, createInitialState, storeCap } from './state';
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
    const loaded = fillDefaults({ version: 2, store: { kohle: 5 }, wagons: [{ type: 'ernte', machines: [{ resource: 'kohle' }] }, 'kaputt', { level: 3 }] });
    expect(loaded.store['kohle']).toBe(5);
    expect(loaded.store['eisenerz']).toBe(0);
    expect(loaded.wagons).toHaveLength(1);
    expect(loaded.wagons[0]?.machines[0]?.resource).toBe('kohle');
    expect(loaded.nextWagonId).toBe(2);
    expect(loaded.projects['bruecke']?.done).toBe(false);
    expect(loaded.discoveredBiomes).toContain('tal');
    expect(loaded.techs.current).toBeNull();
  });

  it('gibt einem Wagen ohne Maschine eine leere, damit er bedienbar bleibt', () => {
    const loaded = fillDefaults({ version: 2, wagons: [{ type: 'werk', machines: [] }] });
    expect(loaded.wagons[0]?.machines).toHaveLength(1);
    expect(loaded.wagons[0]?.machines[0]?.recipe).toBeNull();
  });

  it('hebt ältere Versionen auf die aktuelle an', () => {
    const loaded = deserialize(JSON.stringify({ version: 0, playedSeconds: 42, pos: 250 }));
    expect(loaded.version).toBe(STATE_VERSION);
    expect(loaded.playedSeconds).toBe(42);
    expect(loaded.km).toBeCloseTo(2.5);
  });

  it('macht aus mehreren Wagen eines Typs einen Wagen mit Maschinen', () => {
    const alt = {
      version: 1,
      wagons: [
        { id: 1, type: 'ernte', level: 2, resource: 'eisenerz', crankUntil: 12 },
        { id: 2, type: 'schmelz', level: 1, recipe: 'koks' },
        { id: 3, type: 'ernte', level: 3, resource: 'kohle' },
        { id: 4, type: 'lager' },
        { id: 5, type: 'lager' },
      ],
    };
    const loaded = deserialize(JSON.stringify(alt));
    expect(loaded.version).toBe(STATE_VERSION);
    expect(loaded.wagons.map((w) => w.type)).toEqual(['ernte', 'schmelz', 'lager']);
    const ernte = loaded.wagons[0]!;
    // Die höchste Stufe der Gruppe gilt für den ganzen Wagen
    expect(ernte.level).toBe(3);
    expect(ernte.crankUntil).toBe(12);
    expect(ernte.machines.map((m) => m.resource)).toEqual(['eisenerz', 'kohle']);
    expect(loaded.wagons[1]?.machines[0]?.recipe).toBe('koks');
    // Zwei Lagerwagen werden zwei Regale: Die Kapazität bleibt genau gleich
    expect(loaded.wagons[2]?.machines).toHaveLength(2);
    expect(storeCap(loaded)).toBe(BALANCE.storeBaseCap + 2 * BALANCE.storeCapPerRegal);
    expect(new Set(loaded.wagons.flatMap((w) => w.machines.map((m) => m.id))).size).toBe(5);
  });

  it('lehnt Unsinn ab', () => {
    expect(() => deserialize('[]')).toThrow();
    expect(() => deserialize('nicht json')).toThrow();
  });
});
