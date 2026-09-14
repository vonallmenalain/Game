import { describe, expect, it } from 'vitest';
import { createInitialState } from '../engine';
import { addMachine, addWagon, grant, research, runFor } from '../engine/sim/testkit';
import { productConsumption, wagonProducts } from './products';

describe('Produkte je Wagen', () => {
  it('nennt im Erntewagen jeden entdeckten Rohstoff mit seinen Maschinen', () => {
    const s = createInitialState();
    research(s, 'selbstlader');
    addMachine(s, s.wagons[0]!, { resource: 'eisenerz' });
    const produkte = wagonProducts(s, s.wagons[0]!);
    expect(produkte.map((p) => p.item)).toEqual(['eisenerz', 'kohle', 'holz', 'stein']);
    expect(produkte[0]?.machines).toHaveLength(2);
    expect(produkte[0]?.rate).toBe(90);
    expect(produkte[1]?.machines).toHaveLength(0);
    expect(produkte[1]?.perMachine).toBe(45);
  });

  it('nennt im Produktionswagen jedes freigeschaltete Rezept und den Verbrauch der zugeteilten Maschinen', () => {
    const s = createInitialState();
    research(s, 'schmelzwagen');
    grant(s, { kohle: 50, eisenerz: 50 });
    const w = addWagon(s, 'schmelz', { recipe: 'eisenbarren' });
    addMachine(s, w, { recipe: 'eisenbarren' });
    runFor(s, 1);
    const produkte = wagonProducts(s, w);
    expect(produkte.map((p) => p.key)).toEqual(['koks', 'eisenbarren']);
    const barren = produkte[1]!;
    expect(barren.machines).toHaveLength(2);
    expect(barren.rate).toBe(30);
    expect(barren.perMachine).toBe(15);
    expect(productConsumption(barren)).toEqual([
      { item: 'eisenerz', amount: 60 },
      { item: 'koks', amount: 30 },
    ]);
    expect(productConsumption(produkte[0]!)).toEqual([]);
  });

  it('hat im Lagerwagen keine Produkte', () => {
    const s = createInitialState();
    research(s, 'lagerwagen');
    expect(wagonProducts(s, addWagon(s, 'lager'))).toEqual([]);
  });
});
