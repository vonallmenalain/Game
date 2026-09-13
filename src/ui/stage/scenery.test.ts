import { describe, expect, it } from 'vitest';
import { OBSTACLE_BY_ID, createInitialState } from '../../engine';
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
    s.pos = OBSTACLE_BY_ID['schlucht']!.km * 100;
    expect(stageMode(s)).toBe('hindernis');
    expect(blockingObstacle(s)?.id).toBe('schlucht');
    s.projects['bruecke']!.done = true;
    expect(blockingObstacle(s)).toBeNull();
  });
});

describe('Hügel und Farben', () => {
  it('mischt Farben und bleibt im Hex-Format', async () => {
    const { mix } = await import('./scenery');
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#102030', '#102030', 0.3)).toBe('#102030');
    expect(mix('#ff0000', '#0000ff', 0)).toBe('#ff0000');
    expect(mix('#ff0000', '#0000ff', 1)).toBe('#0000ff');
  });

  it('zeichnet Kämme, die über die Kachel nahtlos wiederkehren', async () => {
    const { ridgePath, peaksPath } = await import('./scenery');
    const ridge = ridgePath(900, 100, 60, 300, 3);
    expect(ridge.startsWith('M')).toBe(true);
    expect(ridge.endsWith('Z')).toBe(true);
    expect(ridgePath(900, 100, 60, 300, 3)).toBe(ridge);
    expect(ridgePath(900, 100, 60, 300, 4)).not.toBe(ridge);
    // Der Kamm liegt zwischen Basis und Basis minus Amplitude
    const ys = [...ridge.matchAll(/Q[-\d.]+ ([-\d.]+)/g)].map((m) => Number(m[1]));
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(40 - 0.1);
    expect(Math.max(...ys)).toBeLessThanOrEqual(100 + 0.1);
    const peaks = peaksPath(900, 100, 120, 300, 7);
    const first = /M([-\d.]+) ([-\d.]+)/.exec(peaks.ridge)!;
    // Erster Punkt bei -5 und der Punkt bei 895 haben dieselbe Höhe: eine Periode später
    const points = [...peaks.ridge.matchAll(/[ML]([-\d.]+) ([-\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const at = (x: number) => points.find((p) => p[0] === x)?.[1];
    expect(at(-5)).toBe(at(895));
    expect(Number(first[1])).toBe(-5);
    expect(peaks.caps.length).toBeGreaterThan(0);
  });
});
