/**
 * Svelte-Aktionen, die Teile der Bühne an die Bewegungsuhr hängen. Sie schreiben
 * direkt ins DOM, ohne Reaktivität: Je Bild ein Transform, sonst nichts.
 */
import type { Motion } from './motion';

export interface RollParams {
  motion?: Motion | undefined;
  /** Radius in Welt-Bildpunkten. Räder drehen sich gegen den Uhrzeiger: Der Zug fährt nach links. */
  radius: number;
}

/** Dreht ein Rad passend zur gefahrenen Strecke. Ursprung setzt der Aufrufer per transform-origin. */
export function roll(node: HTMLElement | SVGElement, params: RollParams) {
  let off: (() => void) | null = null;
  const apply = (p: RollParams) => {
    off?.();
    off = null;
    if (!p.motion || p.radius <= 0) {
      node.style.transform = '';
      return;
    }
    const radius = p.radius;
    off = p.motion.subscribe((dist) => {
      const deg = ((-(dist / radius) * 180) / Math.PI) % 360;
      node.style.transform = `rotate(${deg.toFixed(2)}deg)`;
    });
  };
  apply(params);
  return {
    update: apply,
    destroy: () => off?.(),
  };
}

export interface SlideParams {
  motion?: Motion | undefined;
  /** Anteil der Zugstrecke, den diese Ebene mitzieht */
  factor: number;
  /** Nach so vielen Welt-Bildpunkten wiederholt sich der Inhalt */
  period: number;
}

/** Schiebt eine Landschaftsebene nach rechts, wenn der Zug nach links fährt, und springt nahtlos zurück. */
export function slide(node: HTMLElement, params: SlideParams) {
  let off: (() => void) | null = null;
  const apply = (p: SlideParams) => {
    off?.();
    off = null;
    if (!p.motion || p.period <= 0) {
      node.style.transform = '';
      return;
    }
    const { factor, period } = p;
    off = p.motion.subscribe((dist) => {
      const shift = ((dist * factor) % period) + 0;
      node.style.transform = `translate3d(${shift.toFixed(2)}px, 0, 0)`;
    });
  };
  apply(params);
  return {
    update: apply,
    destroy: () => off?.(),
  };
}

export interface FollowParams {
  motion?: Motion | undefined;
  /** Sobald wahr, zieht das Element mit dem Boden nach rechts weg */
  active: boolean;
  /** Nach so vielen Welt-Bildpunkten ist es aus dem Bild und meldet sich ab */
  until: number;
  onpassed?: () => void;
}

/** Lässt ein Bauwerk mit dem Boden mitziehen, sobald der Zug weiterfährt. */
export function follow(node: HTMLElement | SVGElement, params: FollowParams) {
  let off: (() => void) | null = null;
  let wasActive = false;
  const apply = (p: FollowParams) => {
    if (p.active && !wasActive) {
      wasActive = true;
      const motion = p.motion;
      if (!motion) return;
      const start = motion.dist;
      off = motion.subscribe((dist) => {
        const d = dist - start;
        node.style.transform = `translate3d(${d.toFixed(2)}px, 0, 0)`;
        if (d > p.until) {
          off?.();
          off = null;
          p.onpassed?.();
        }
      });
    } else if (!p.active && wasActive) {
      wasActive = false;
      off?.();
      off = null;
      node.style.transform = '';
    }
  };
  apply(params);
  return {
    update: apply,
    destroy: () => off?.(),
  };
}
