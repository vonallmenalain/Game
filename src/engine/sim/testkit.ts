/**
 * Hilfen für Tests und Simulationen. Nicht Teil der Engine-Schnittstelle.
 */
import type { GameState, ItemId, RecipeId, TechId, WagonState, WagonType } from '../types';
import { tick } from '../tick';

export function runFor(state: GameState, seconds: number, dt = 0.25): void {
  let done = 0;
  while (done < seconds - 1e-9) {
    const step = Math.min(dt, seconds - done);
    tick(state, step);
    done += step;
  }
}

export function grant(state: GameState, items: Record<ItemId, number>): void {
  for (const [item, amount] of Object.entries(items)) state.store[item] = (state.store[item] ?? 0) + amount;
}

/** Technologien direkt als erforscht eintragen, ohne Kosten und Zeit */
export function research(state: GameState, ...techs: TechId[]): void {
  for (const id of techs) if (!state.techs.done.includes(id)) state.techs.done.push(id);
}

/** Wagen ohne Kosten anhängen */
export function addWagon(state: GameState, type: WagonType, init: { recipe?: RecipeId; resource?: ItemId; level?: number } = {}): WagonState {
  const w: WagonState = {
    id: state.nextWagonId,
    type,
    level: init.level ?? 1,
    recipe: init.recipe ?? null,
    resource: init.resource ?? null,
    progress: 0,
    cycleActive: false,
    status: 'leer',
    crankUntil: 0,
  };
  state.nextWagonId += 1;
  state.wagons.push(w);
  return w;
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
