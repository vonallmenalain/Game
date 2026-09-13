import { describe, expect, it } from 'vitest';
import { createInitialState } from './state';
import { addMachine, addWagon, grant, research, runFor } from './sim/testkit';

/** Der Zug aus Abschnitt 7.3 des Konzepts: fünf Wagen, sieben Maschinen */
function chain(werkRecipe: string) {
  const s = createInitialState();
  research(s, 'selbstlader', 'schmelzwagen', 'werkwagen', 'walzwagen', 'konstruktionsbuero');
  grant(s, { kohle: 50, holz: 400 });
  addMachine(s, s.wagons[0]!, { resource: 'kohle' });
  const schmelz = addWagon(s, 'schmelz', { recipe: 'koks' });
  addMachine(s, schmelz, { recipe: 'eisenbarren' });
  addWagon(s, 'walz', { recipe: 'schienen' });
  addWagon(s, 'werk', { recipe: werkRecipe });
  addWagon(s, 'buero', { recipe: 'bp_eisen' });
  return s;
}

function railsPerMinute(s: ReturnType<typeof createInitialState>): number {
  runFor(s, 600);
  const before = s.stats.produced['schienen'] ?? 0;
  runFor(s, 600);
  return ((s.stats.produced['schienen'] ?? 0) - before) / 10;
}

describe('Kettenrechnung aus dem Konzept', () => {
  it('sieben Maschinen in fünf Wagen liefern rund 20 Schienen pro Minute', () => {
    const s = chain('bretter');
    expect(s.wagons).toHaveLength(5);
    expect(s.wagons.reduce((sum, w) => sum + w.machines.length, 0)).toBe(7);
    const perMinute = railsPerMinute(s);
    expect(perMinute).toBeGreaterThanOrEqual(19);
    expect(perMinute).toBeLessThanOrEqual(23);
    expect(s.km).toBeGreaterThan(2);
  });

  it('ein Montagetisch auf Zahnrad konkurriert um Eisenbarren und drückt die Schienen', () => {
    const s = chain('zahnrad');
    const perMinute = railsPerMinute(s);
    expect(perMinute).toBeGreaterThanOrEqual(12);
    expect(perMinute).toBeLessThan(19);
    expect(s.stats.produced['zahnrad'] ?? 0).toBeGreaterThan(50);
  });
});
