import { describe, expect, it } from 'vitest';
import { assignMachine, idleMachines, machinesFor, unassignMachine } from './actions';
import { createInitialState } from './state';
import { addMachine, addWagon, grant, research, runFor } from './sim/testkit';

describe('Maschinen je Auftrag zuteilen', () => {
  it('gibt einer freien Maschine das Rezept und zählt sie beim Auftrag', () => {
    const s = createInitialState();
    research(s, 'schmelzwagen');
    const w = addWagon(s, 'schmelz');
    addMachine(s, w);
    expect(idleMachines(w)).toHaveLength(2);
    expect(assignMachine(s, w.id, { recipe: 'koks' }).ok).toBe(true);
    expect(assignMachine(s, w.id, { recipe: 'koks' }).ok).toBe(true);
    expect(machinesFor(w, { recipe: 'koks' })).toHaveLength(2);
    expect(idleMachines(w)).toHaveLength(0);
    // Ohne freie Maschine geht nichts: Eine neue bauen oder eine wegnehmen
    expect(assignMachine(s, w.id, { recipe: 'eisenbarren' })).toMatchObject({ ok: false, code: 'keine_freie_maschine' });
  });

  it('nimmt eine Maschine vom Auftrag und stellt sie frei, zuerst eine, die nicht arbeitet', () => {
    const s = createInitialState();
    research(s, 'schmelzwagen');
    grant(s, { kohle: 2 });
    const w = addWagon(s, 'schmelz', { recipe: 'koks' });
    addMachine(s, w, { recipe: 'koks' });
    runFor(s, 1);
    // Zwei Kohle reichen für zwei Zyklen, beide laufen
    expect(w.machines.filter((m) => m.status === 'aktiv')).toHaveLength(2);
    const [erste, zweite] = w.machines;
    zweite!.status = 'wartet';
    expect(unassignMachine(s, w.id, { recipe: 'koks' }).ok).toBe(true);
    expect(zweite!.recipe).toBeNull();
    expect(erste!.recipe).toBe('koks');
    expect(idleMachines(w)).toHaveLength(1);
    expect(unassignMachine(s, w.id, { recipe: 'eisenbarren' })).toMatchObject({ ok: false, code: 'unbekannt' });
  });

  it('teilt im Erntewagen nach Rohstoff zu und prüft, ob er entdeckt ist', () => {
    const s = createInitialState();
    const w = s.wagons[0]!;
    addMachine(s, w);
    expect(assignMachine(s, w.id, { resource: 'harz' })).toMatchObject({ ok: false, code: 'rohstoff_unbekannt' });
    expect(idleMachines(w)).toHaveLength(1);
    expect(assignMachine(s, w.id, { resource: 'kohle' }).ok).toBe(true);
    expect(machinesFor(w, { resource: 'kohle' })).toHaveLength(1);
    expect(machinesFor(w, { resource: 'eisenerz' })).toHaveLength(1);
    expect(unassignMachine(s, w.id, { resource: 'eisenerz' }).ok).toBe(true);
    expect(w.machines.map((m) => m.resource)).toEqual([null, 'kohle']);
  });
});
