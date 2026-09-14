import { describe, expect, it } from 'vitest';
import { createInitialState } from './state';
import { flowPerMinute, flowSources } from './tick';
import { addMachine, addWagon, grant, research } from './sim/testkit';

describe('Fluss je Quelle', () => {
  it('fasst Maschinen mit gleichem Auftrag im Wagen zusammen und summiert zum Saldo', () => {
    const s = createInitialState();
    research(s, 'selbstlader', 'schmelzwagen');
    grant(s, { kohle: 50 });
    const schmelz = addWagon(s, 'schmelz', { recipe: 'koks' });
    addMachine(s, schmelz, { recipe: 'koks' });
    addMachine(s, schmelz, { recipe: 'eisenbarren' });
    const quellen = flowSources(s);
    const koks = quellen['koks'] ?? [];
    expect(koks).toHaveLength(2);
    const oefen = koks.find((q) => q.recipe === 'koks');
    expect(oefen).toMatchObject({ via: 'maschine', wagonId: schmelz.id, wagonType: 'schmelz', machines: 2, perMinute: 60 });
    const barren = koks.find((q) => q.recipe === 'eisenbarren');
    // Der Barrenofen hat kurze Wege zum Koks daneben und läuft darum schneller
    expect(barren?.machines).toBe(1);
    expect(barren?.perMinute).toBeCloseTo(-15 * 1.1, 5);
    const saldo = flowPerMinute(s);
    for (const [item, list] of Object.entries(quellen)) {
      expect(saldo[item]).toBeCloseTo(list.reduce((sum, q) => sum + q.perMinute, 0), 9);
    }
  });

  it('nennt Erntemaschinen je Rohstoff, die Werkbank und die Fahrt', () => {
    const s = createInitialState();
    research(s, 'selbstlader');
    grant(s, { schienen: 50, kohle: 50 });
    addMachine(s, s.wagons[0]!, { resource: 'eisenerz' });
    s.workbench.queue.push('koks');
    const quellen = flowSources(s);
    expect(quellen['eisenerz']).toEqual([{ via: 'maschine', wagonId: 1, wagonType: 'ernte', resource: 'eisenerz', machines: 2, perMinute: 90 }]);
    expect(quellen['koks']).toEqual([{ via: 'werkbank', recipe: 'koks', machines: 0, perMinute: 30 }]);
    const kohle = quellen['kohle'] ?? [];
    expect(kohle.find((q) => q.via === 'werkbank')?.perMinute).toBe(-30);
    expect(kohle.find((q) => q.via === 'fahrt')?.perMinute).toBeCloseTo(-7, 5);
    expect(quellen['schienen']?.find((q) => q.via === 'fahrt')?.perMinute).toBeCloseTo(-(14 / 60) * 100, 5);
  });

  it('zählt keine Maschine, die nicht laufen kann', () => {
    const s = createInitialState();
    // Ohne Selbstlader und ohne Kurbel steht die Ernte still
    expect(flowSources(s)['eisenerz']).toBeUndefined();
  });
});
