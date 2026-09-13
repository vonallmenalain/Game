/**
 * Das Triebwerk einer Dampflok: Die Kuppelstange verbindet die Kurbelzapfen aller
 * Treibräder und bewegt sich rein parallel auf einem Kreis. Die Treibstange geht vom
 * Kreuzkopf zum Zapfen eines Treibrads und kippt dabei, der Kreuzkopf gleitet
 * waagrecht. Alles folgt aus dem Drehwinkel der Räder, den die gefahrene Strecke gibt.
 */
import type { Motion } from './motion';

export interface RodGeometry {
  /** Radius der Treibräder in Einheiten */
  radius: number;
  /** Kurbelradius: Abstand des Zapfens von der Achse */
  crank: number;
  /** x der Achse, an deren Zapfen die Treibstange hängt */
  driver: number;
  /** Höhe der Achsen */
  cy: number;
  /** Länge der Treibstange */
  rod: number;
}

export interface RodParts {
  coupling: SVGGElement;
  main: SVGGElement;
  crosshead: SVGGElement;
}

/** Ruhelage des Kreuzkopfs: Zapfen ganz vorne minus Stangenlänge */
export function crossheadRest(g: RodGeometry): number {
  return g.driver + g.crank - g.rod;
}

/** Stellt das Gestänge für einen Drehwinkel (Bogenmass, negativ = Fahrt nach links). */
export function poseRods(parts: RodParts, g: RodGeometry, angle: number): void {
  const dx = g.crank * Math.cos(angle) - g.crank;
  const dy = g.crank * Math.sin(angle);
  parts.coupling.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`;
  const pinX = g.driver + g.crank + dx;
  const pinY = g.cy + dy;
  const rest = crossheadRest(g);
  const xh = pinX - Math.sqrt(g.rod * g.rod - dy * dy);
  const phi = (Math.atan2(pinY - g.cy, pinX - xh) * 180) / Math.PI;
  parts.main.style.transform = `translate(${(xh - rest).toFixed(2)}px, 0) rotate(${phi.toFixed(2)}deg)`;
  parts.crosshead.style.transform = `translate(${(xh - rest).toFixed(2)}px, 0)`;
}

/** Hängt das Gestänge an die Bewegungsuhr. Liefert die Abmeldung. */
export function attachRods(motion: Motion, parts: RodParts, g: RodGeometry, unit: number): () => void {
  return motion.subscribe((dist) => poseRods(parts, g, -(dist / (g.radius * unit))));
}
