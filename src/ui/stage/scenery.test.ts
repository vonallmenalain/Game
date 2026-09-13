import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../engine';
import { biomeMood, blockingObstacle, noise, plantsFor, stageMode } from './scenery';

describe('Bühne', () => {
  it('hat für jedes Biom eine Stimmung in beiden Themes', () => {
    for (const id of ['tal', 'wald', 'berg', 'wueste']) {
      for (const dark of [false, true]) {
        const mood = biomeMood(id, dark);
        for (const [key, value] of Object.entries(mood)) {
          if (typeof value === 'string' && key !== 'floraKind') expect(value, `${id} ${dark} ${key}`).toMatch(/^#[0-9a-f]{6}$/i);
        }
      }
    }
    expect(biomeMood('tal', true).ground).not.toBe(biomeMood('tal', false).ground);
  });

  it('streut deterministisch, ohne Flackern', () => {
    expect(noise(7)).toBe(noise(7));
    expect(noise(7)).not.toBe(noise(8));
    for (let i = 0; i < 50; i += 1) {
      const n = noise(i);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
    const a = plantsFor(3, 600, 1);
    expect(plantsFor(3, 600, 1)).toEqual(a);
    expect(plantsFor(4, 600, 1)).not.toEqual(a);
    for (const plant of a) {
      expect(plant.x).toBeGreaterThanOrEqual(0);
      expect(plant.x).toBeLessThan(600);
      expect(plant.scale).toBeGreaterThan(0.5);
    }
    expect(plantsFor(1, 600, 0.3).length).toBeLessThan(plantsFor(1, 600, 1).length);
  });

  it('kennt Fahren, Stehen und das Hindernis davor', () => {
    const s = createInitialState();
    expect(stageMode(s)).toBe('faehrt');
    s.stop = 'schienen';
    expect(stageMode(s)).toBe('steht');
    expect(blockingObstacle(s)).toBeNull();
    s.stop = 'hindernis';
    s.pos = 2400;
    expect(stageMode(s)).toBe('hindernis');
    expect(blockingObstacle(s)?.id).toBe('schlucht');
    s.projects['bruecke']!.done = true;
    expect(blockingObstacle(s)).toBeNull();
  });
});
