/**
 * Die Kamera der Bühne. Die Welt ist eine Seitenansicht in Bildpunkten, die Schiene
 * liegt bei y = 0, die Lok steht bei x = 0 und fährt nach links. Jede Ebene wird
 * um den Punkt (x, 0) skaliert und so verschoben, dass er in der Bildmitte auf der
 * Schienenhöhe liegt. Ferne Ebenen wachsen beim Heranzoomen weniger als nahe,
 * daher der Exponent je Ebene: So entsteht Tiefe wie bei einer Kamerafahrt.
 */
import type { GameState, LocoId, WagonType } from '../../engine';

export interface VehicleSpec {
  /** Länge in Einheiten */
  w: number;
  /** Höhe über der Schiene in Einheiten */
  h: number;
}

export type VehicleKind = WagonType | LocoId | 'platz';

/** Masse der Fahrzeuge in Zeichnungseinheiten. Der Boden liegt in jeder Zeichnung bei y = 100. */
export const VEHICLE_SPEC: Record<VehicleKind, VehicleSpec> = {
  dampflok: { w: 220, h: 100 },
  schwere_dampflok: { w: 312, h: 104 },
  ernte: { w: 150, h: 90 },
  schmelz: { w: 168, h: 92 },
  walz: { w: 160, h: 90 },
  werk: { w: 150, h: 90 },
  buero: { w: 180, h: 88 },
  lager: { w: 150, h: 90 },
  chemie: { w: 150, h: 86 },
  platz: { w: 120, h: 70 },
};

/** Breite der Hindernisse in Einheiten, sie stehen vor der Lok */
export const OBSTACLE_SPEC: Record<string, { w: number }> = {
  schlucht: { w: 150 },
  bergmassiv: { w: 190 },
};

/** Kupplungsabstand zwischen zwei Fahrzeugen in Einheiten */
export const COUPLING = 8;
/** Abstand zwischen Hindernis und Lok in Einheiten */
export const OBSTACLE_GAP = 26;

/** Tiefe der Ebenen als Exponent des Massstabs: 1 = mit dem Zug, 0 = unbewegt */
export const DEPTH = { sky: 0, clouds: 0.12, far: 0.35, mid: 0.72, near: 1 } as const;

/** Wie weit die Ebenen je Strecke des Zuges mitziehen (Parallax) */
export const PARALLAX = { clouds: 0.04, far: 0.14, mid: 0.42, near: 1 } as const;

export interface TrainItem {
  key: string;
  kind: VehicleKind;
  /** Linke Kante in Welt-Bildpunkten */
  x: number;
  w: number;
  h: number;
  wagonId?: number;
}

export interface TrainLayout {
  items: TrainItem[];
  /** Rechte Kante des Zuges samt Platzhalter */
  right: number;
}

/**
 * Stellt die Lok bei x = 0 auf und hängt die Wagen in Zugreihenfolge dahinter.
 * `unit` sind Bildpunkte je Zeichnungseinheit, `ghost` hängt einen Platzhalter an.
 */
export function layoutTrain(state: Pick<GameState, 'loco' | 'wagons'>, unit: number, ghost: boolean): TrainLayout {
  const items: TrainItem[] = [];
  let x = 0;
  const place = (kind: VehicleKind, key: string, wagonId?: number) => {
    const spec = VEHICLE_SPEC[kind];
    const item: TrainItem = { key, kind, x, w: spec.w * unit, h: spec.h * unit };
    if (wagonId !== undefined) item.wagonId = wagonId;
    items.push(item);
    x += (spec.w + COUPLING) * unit;
  };
  place(state.loco, 'lok');
  for (const w of state.wagons) place(w.type, `w${w.id}`, w.id);
  if (ghost) place('platz', 'platz');
  return { items, right: x - COUPLING * unit };
}

export interface Camera {
  /** Bildpunkte je Welt-Bildpunkt */
  s: number;
  /** Weltpunkt auf der Schiene, der in der Bildmitte liegt */
  x: number;
}

export interface Viewport {
  width: number;
  height: number;
  /** Bild-y der Schiene */
  trackY: number;
}

export interface Scene {
  left: number;
  right: number;
}

export const FIT = {
  /** Rand links und rechts im Überblick, in Bildpunkten */
  pad: 14,
  /** Höchster Massstab im Überblick, relativ zum Fokus: Ein kurzer Zug wird nicht riesig */
  maxShare: 0.72,
  /** Unter diesem Massstab wird geschwenkt statt weiter verkleinert */
  min: 0.24,
} as const;

/** Überblick: Der ganze Zug passt ins Bild, sonst wird auf `min` begrenzt und geschwenkt. */
export function fitCamera(scene: Scene, view: Viewport, focusScale: number): Camera {
  const width = Math.max(1, scene.right - scene.left);
  const fit = (view.width - 2 * FIT.pad) / width;
  const s = clamp(fit, FIT.min, FIT.maxShare * focusScale);
  return { s, x: (scene.left + scene.right) / 2 };
}

/** Grenzen für die Bildmitte, damit beim Schwenken nichts Leeres in die Mitte rückt. */
export function panBounds(scene: Scene, s: number, view: Viewport): { min: number; max: number } {
  const half = (view.width / 2 - FIT.pad) / s;
  const min = scene.left + half;
  const max = scene.right - half;
  if (min >= max) {
    const mid = (scene.left + scene.right) / 2;
    return { min: mid, max: mid };
  }
  return { min, max };
}

export const FOCUS = {
  /** Anteil der Bildbreite, den das Fahrzeug höchstens füllt */
  widthShare: 0.9,
  /** Anteil der Höhe über der Schiene, den das Fahrzeug höchstens füllt */
  heightShare: 0.8,
} as const;

/** Fokus: Ein Fahrzeug in der Mitte, so gross wie es die Bühne hergibt, nie über den Zeichnungsmassstab hinaus. */
export function focusCamera(item: Pick<TrainItem, 'x' | 'w' | 'h'>, view: Viewport): Camera {
  const s = Math.min(1, (FOCUS.widthShare * view.width) / item.w, (FOCUS.heightShare * view.trackY) / item.h);
  return { s, x: item.x + item.w / 2 };
}

/** CSS-Transformation einer Ebene mit Ursprung oben links. */
export function layerTransform(cam: Camera, depth: number, view: Viewport): string {
  const s = cam.s ** depth;
  const tx = view.width / 2 - s * cam.x;
  return `translate3d(${round(tx)}px, ${round(view.trackY)}px, 0) scale(${round(s, 4)})`;
}

/** Welt-x-Bereich, den eine Ebene bei diesem Massstab und dieser Mitte sichtbar füllen muss. */
export function visibleRange(cam: Camera, depth: number, view: Viewport): { left: number; right: number } {
  const s = cam.s ** depth;
  const half = view.width / 2 / s;
  return { left: cam.x - half, right: cam.x + half };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
