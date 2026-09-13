import { describe, expect, it } from 'vitest';
import { needsCatchUp, simulateOffline } from './offline';
import { createInitialState, getStore } from './state';
import { addWagon, clone, grant, research, runFor } from './sim/testkit';
import type { GameState } from './types';

function midGame(): GameState {
  const s = createInitialState();
  research(s, 'selbstlader', 'schmelzwagen', 'werkwagen', 'walzwagen', 'konstruktionsbuero', 'lagerwagen');
  grant(s, { kohle: 60, holz: 100, schienen: 40 });
  addWagon(s, 'ernte', { resource: 'kohle' });
  addWagon(s, 'schmelz', { recipe: 'koks' });
  addWagon(s, 'schmelz', { recipe: 'eisenbarren' });
  addWagon(s, 'walz', { recipe: 'schienen' });
  addWagon(s, 'werk', { recipe: 'nieten' });
  addWagon(s, 'lager');
  return s;
}

describe('Nachsimulation', () => {
  it('weicht vom feinen Spielablauf um weniger als ein Prozent ab', () => {
    const live = midGame();
    const offline = clone(live);
    runFor(live, 3600, 0.25);
    const report = simulateOffline(offline, 3600);
    expect(report.simulatedSeconds).toBe(3600);
    expect(Math.abs(live.km - offline.km) / live.km).toBeLessThan(0.01);
    const total = (s: GameState) => Object.values(s.store).reduce((a, b) => a + b, 0);
    expect(Math.abs(total(live) - total(offline)) / total(live)).toBeLessThan(0.01);
  });

  it('deckelt auf acht Stunden, mit Nachtschicht I auf zwölf', () => {
    const s = midGame();
    const r1 = simulateOffline(s, 10 * 3600);
    expect(r1.simulatedSeconds).toBe(8 * 3600);
    expect(r1.lostSeconds).toBe(2 * 3600);
    const t = midGame();
    research(t, 'stahlwerk', 'nachtschicht1');
    const r2 = simulateOffline(t, 20 * 3600);
    expect(r2.simulatedSeconds).toBe(12 * 3600);
  });

  it('berichtet Kilometer, Warnungen und volle Lager', () => {
    const s = createInitialState();
    research(s, 'selbstlader');
    grant(s, { schienen: 50, kohle: 100 });
    const report = simulateOffline(s, 1800);
    expect(report.kmAfter).toBeCloseTo(0.5, 5);
    expect(report.warnings.map((w) => w.code)).toContain('schienen');
    expect(report.warnings[0]?.at).toBeGreaterThan(140);
    expect(report.stoppedSeconds).toBeGreaterThan(1000);
    expect(report.fullItems).toContain('eisenerz');
    expect(getStore(s, 'schienen')).toBe(0);
  });

  it('holt erst ab einer Minute nach', () => {
    expect(needsCatchUp(30)).toBe(false);
    expect(needsCatchUp(60)).toBe(true);
  });
});
