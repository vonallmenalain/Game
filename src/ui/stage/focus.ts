/**
 * Was die Bühne zeigt, hängt vom Register und vom aufgeklappten Detail ab. Der
 * Ausschnitt ist reiner Zustand, abgeleitet aus beidem: Auf Zug, Werkstatt und
 * Forschung der ganze Zug, im Lager der Lagerwagen, auf der Strecke die Lok.
 * Ein aufgeklappter Wagen holt sich die Kamera, zugeklappt kommt der Zug zurück.
 */
import type { GameState } from '../../engine';
import type { DetailKind } from '../game.svelte';
import type { Tab } from '../tabs';

export type StageFocus = { kind: 'zug' } | { kind: 'lok' } | { kind: 'wagen'; id: number };

export function stageFocus(tab: Tab, detail: DetailKind, state: GameState): StageFocus {
  switch (tab) {
    case 'zug': {
      if (detail.kind === 'wagen' && state.wagons.some((w) => w.id === detail.id)) return { kind: 'wagen', id: detail.id };
      return { kind: 'zug' };
    }
    case 'lager': {
      const lager = state.wagons.find((w) => w.type === 'lager');
      return lager ? { kind: 'wagen', id: lager.id } : { kind: 'zug' };
    }
    case 'strecke':
      return { kind: 'lok' };
    default:
      return { kind: 'zug' };
  }
}

export function sameFocus(a: StageFocus, b: StageFocus): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind === 'wagen' && b.kind === 'wagen' ? a.id === b.id : true;
}
