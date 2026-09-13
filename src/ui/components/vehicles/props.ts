/** Was jeder Wagen über sich weiss, damit die Zeichnung Zustand zeigen kann. */
export interface WagonProps {
  /** Bildpunkte je Zeichnungseinheit auf der Bühne, 0 in Karten und Listen */
  unit?: number;
  /** Mindestens eine Maschine läuft: Feuer, Funken, drehende Teile */
  active?: boolean;
  level?: number;
  tone?: 'good' | 'warn' | 'mute';
  dark?: boolean;
}
