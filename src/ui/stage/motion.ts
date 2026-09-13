/**
 * Eine Uhr für alles, was mit dem Zug fährt: Räder, Gestänge, Boden, Pflanzen und
 * Hügel. Sie zählt die gefahrene Strecke in Welt-Bildpunkten und ruft je Bild alle
 * Abonnenten. Anfahren und Bremsen dauern ein paar Sekunden, damit nichts springt.
 */
export type MotionSubscriber = (dist: number) => void;

/** Gefühlte Strecke je Sekunde in Zeichnungseinheiten bei 14 km/h. Kein Massstab, ein Tempo fürs Auge. */
export const UNITS_PER_SECOND = 72;
export const ACCEL_SECONDS = 2.2;
export const BRAKE_SECONDS = 1.6;

export class Motion {
  /** Gefahrene Strecke in Welt-Bildpunkten */
  dist = 0;
  /** 0 steht, 1 volle Fahrt */
  rate = 0;
  target = 0;
  /** Welt-Bildpunkte je Sekunde bei voller Fahrt */
  speed = 0;
  private subs = new Set<MotionSubscriber>();

  subscribe(fn: MotionSubscriber): () => void {
    this.subs.add(fn);
    fn(this.dist);
    return () => {
      this.subs.delete(fn);
    };
  }

  /** Setzt alle Abonnenten auf den aktuellen Stand, etwa nach einem Wechsel des Massstabs. */
  refresh(): void {
    for (const fn of this.subs) fn(this.dist);
  }

  /** Ein Bild weiter um dt Sekunden. Liefert true, solange noch Bewegung drin ist. */
  step(dt: number): boolean {
    const d = Math.min(dt, 0.1);
    if (this.rate < this.target) this.rate = Math.min(this.target, this.rate + d / ACCEL_SECONDS);
    else if (this.rate > this.target) this.rate = Math.max(this.target, this.rate - d / BRAKE_SECONDS);
    if (this.rate > 0) {
      // Weich: langsam los, langsam aus
      const eased = this.rate * this.rate * (3 - 2 * this.rate);
      this.dist += this.speed * eased * d;
      for (const fn of this.subs) fn(this.dist);
    }
    return this.rate > 0 || this.target > 0;
  }
}

/** Gefühltes Tempo in Einheiten je Sekunde, schneller mit einer schnelleren Lok. */
export function feltSpeed(speedKmh: number): number {
  return UNITS_PER_SECOND * (speedKmh / 14);
}
