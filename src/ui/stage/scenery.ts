/**
 * Die Bühne ist eine Illustration, keine massstabsgetreue Karte. Sie zeigt drei Dinge:
 * die Stimmung des Bioms, ob der Zug fährt, und was gerade vor ihm liegt.
 */
import type { BiomeId, GameState, ObstacleId } from '../../engine';
import { OBSTACLES } from '../../engine';

export interface BiomeMood {
  /** Himmel von oben nach unten */
  skyTop: string;
  skyBottom: string;
  /** Ferne Hügel, mittlere Ebene, Boden */
  far: string;
  mid: string;
  ground: string;
  /** Farbe der Vegetation oder Felsen in der mittleren Ebene */
  flora: string;
  /** Form der mittleren Ebene */
  floraKind: 'baum' | 'busch' | 'fels' | 'kaktus';
  /** Dichte der mittleren Ebene, 0 bis 1 */
  density: number;
}

const MOODS: Record<BiomeId, BiomeMood> = {
  tal: { skyTop: '#a8c4d8', skyBottom: '#dce6e2', far: '#8fa392', mid: '#7a9a6a', ground: '#6d8259', flora: '#5e7d4f', floraKind: 'busch', density: 0.7 },
  wald: { skyTop: '#8fb0c4', skyBottom: '#cfdcd2', far: '#5c7a5e', mid: '#3f6b46', ground: '#456b3f', flora: '#2f5537', floraKind: 'baum', density: 1 },
  berg: { skyTop: '#9fb4cc', skyBottom: '#d4dce6', far: '#7e8ea6', mid: '#6b7c93', ground: '#68727f', flora: '#58657a', floraKind: 'fels', density: 0.7 },
  wueste: { skyTop: '#d8c89a', skyBottom: '#eee0c0', far: '#c9b98a', mid: '#c9a860', ground: '#c2a361', flora: '#96a35f', floraKind: 'kaktus', density: 0.3 },
};

const DARK: Partial<Record<BiomeId, Partial<BiomeMood>>> = {
  tal: { skyTop: '#2a3c4a', skyBottom: '#374a52', far: '#3d5144', mid: '#354d39', ground: '#324430' },
  wald: { skyTop: '#23343f', skyBottom: '#2e4443', far: '#2e4534', mid: '#243e2a', ground: '#293d27' },
  berg: { skyTop: '#2a3849', skyBottom: '#3a4b5e', far: '#46566f', mid: '#3a4759', ground: '#333e4c' },
  wueste: { skyTop: '#3a3222', skyBottom: '#45392a', far: '#4a412c', mid: '#4a3d22', ground: '#453a24' },
};

export function biomeMood(id: BiomeId, dark: boolean): BiomeMood {
  const base = MOODS[id] ?? MOODS['tal']!;
  return dark ? { ...base, ...(DARK[id] ?? {}) } : base;
}

/**
 * Deterministischer Pseudozufall aus einer ganzen Zahl. Gleiche Kachel, gleiches Bild,
 * auch nach einem Neuladen. Kein Math.random, damit die Landschaft nicht flackert.
 */
export function noise(seed: number): number {
  let x = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

export interface Plant {
  x: number;
  scale: number;
  shade: number;
}

/** Streut Pflanzen oder Felsen über eine Kachel, deterministisch aus ihrem Index. */
export function plantsFor(tile: number, width: number, density: number): Plant[] {
  const count = Math.round(density * 7);
  const out: Plant[] = [];
  for (let i = 0; i < count; i += 1) {
    const seed = tile * 101 + i * 17;
    out.push({
      x: (i / count + noise(seed) / count) * width,
      scale: 0.7 + noise(seed + 1) * 0.6,
      shade: noise(seed + 2),
    });
  }
  return out;
}

export type StageMode = 'faehrt' | 'hindernis' | 'steht';

export function stageMode(state: GameState): StageMode {
  if (state.stop === 'faehrt') return 'faehrt';
  if (state.stop === 'hindernis') return 'hindernis';
  return 'steht';
}

/** Das Hindernis, vor dem der Zug gerade steht, falls eines da ist. */
export function blockingObstacle(state: GameState): { id: ObstacleId; name: string; project: string } | null {
  if (state.stop !== 'hindernis') return null;
  const obstacle = OBSTACLES.find((o) => o.km * 100 === state.pos && !state.projects[o.project]?.done);
  return obstacle ? { id: obstacle.id, name: obstacle.name, project: obstacle.project } : null;
}

/** Mischt zwei Hex-Farben: t = 0 gibt a, t = 1 gibt b. */
export function mix(a: string, b: string, t: number): string {
  const pa = hex(a);
  const pb = hex(b);
  const k = Math.min(1, Math.max(0, t));
  const c = pa.map((v, i) => Math.round(v + ((pb[i] ?? 0) - v) * k));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function hex(color: string): number[] {
  const m = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return [128, 128, 128];
  const n = Number.parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Ein weicher Hügelkamm, der über die Kachelbreite nahtlos wiederkehrt: eine Summe
 * von Kosinuswellen mit ganzzahligen Frequenzen, über Mittelpunkte geglättet. Der
 * Pfad ragt eine halbe Stützweite über die Kachel hinaus, damit der Übergang
 * zwischen zwei Kacheln keine Kante hat. Geschlossen wird bis `bottom`.
 */
export function ridgePath(width: number, base: number, amplitude: number, bottom: number, seed: number, samples = 40): string {
  const waves = [1, 2, 3, 5].map((f, k) => ({ f, a: 0.25 + noise(seed + k) * 0.75, p: noise(seed + 10 + k) * Math.PI * 2 }));
  const sum = waves.reduce((acc, w) => acc + w.a, 0);
  const h = (x: number) => waves.reduce((acc, w) => acc + (w.a * (1 + Math.cos((2 * Math.PI * w.f * x) / width + w.p))) / 2, 0) / sum;
  const step = width / samples;
  const pts: [number, number][] = [];
  for (let i = -1; i <= samples + 1; i += 1) {
    const x = i * step;
    pts.push([x, base - amplitude * h(x)]);
  }
  const mid = (i: number): [number, number] => [(pts[i]![0] + pts[i + 1]![0]) / 2, (pts[i]![1] + pts[i + 1]![1]) / 2];
  let d = `M${r(mid(0)[0])} ${r(mid(0)[1])}`;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const m = mid(i);
    d += ` Q${r(pts[i]![0])} ${r(pts[i]![1])} ${r(m[0])} ${r(m[1])}`;
  }
  const last = mid(pts.length - 2);
  d += ` L${r(last[0])} ${r(bottom)} L${r(mid(0)[0])} ${r(bottom)} Z`;
  return d;
}

/**
 * Zackige Gipfel für das Gebirge: Kegel um gestreute Spitzen, der Kamm ist ihr
 * Maximum. Auch hier wiederkehrend über die Kachel. Liefert dazu die Schneekappen.
 */
export function peaksPath(width: number, base: number, height: number, bottom: number, seed: number, count = 5): { ridge: string; caps: string } {
  const slope = 1.15;
  const peaks = Array.from({ length: count }, (_, k) => ({
    x: ((k + 0.2 + noise(seed + k) * 0.6) / count) * width,
    h: height * (0.55 + noise(seed + 20 + k) * 0.45),
  }));
  const dist = (x: number, p: number) => {
    const d = Math.abs(((x - p) % width) + width) % width;
    return Math.min(d, width - d);
  };
  const h = (x: number) => Math.max(0, ...peaks.map((p) => p.h - slope * dist(x, p.x)));
  const step = 5;
  let ridge = '';
  for (let x = -step; x <= width + step; x += step) ridge += `${ridge ? ' L' : 'M'}${r(x)} ${r(base - h(x))}`;
  ridge += ` L${r(width + step)} ${r(bottom)} L${r(-step)} ${r(bottom)} Z`;
  const capH = height * 0.16;
  const caps = peaks
    .filter((p) => p.h > capH * 2)
    .map((p) => {
      const half = capH / slope;
      const y = base - p.h;
      return `M${r(p.x - half)} ${r(y + capH)} L${r(p.x)} ${r(y)} L${r(p.x + half)} ${r(y + capH)} Q${r(p.x + half * 0.4)} ${r(y + capH * 1.35)} ${r(p.x)} ${r(y + capH * 0.9)} Q${r(p.x - half * 0.45)} ${r(y + capH * 1.3)} ${r(p.x - half)} ${r(y + capH)} Z`;
    })
    .join(' ');
  return { ridge, caps };
}

function r(v: number): number {
  return Math.round(v * 10) / 10;
}
