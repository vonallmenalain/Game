/**
 * Hilfen für Tests und Simulationen. Nicht Teil der Engine-Schnittstelle.
 */
import type { GameState, ItemId, MachineState, RecipeId, TechId, WagonState, WagonType } from '../types';
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

/** Wagen ohne Kosten anhängen, mit einer Maschine darin */
export function addWagon(state: GameState, type: WagonType, init: { recipe?: RecipeId; resource?: ItemId; level?: number } = {}): WagonState {
  const w: WagonState = {
    id: state.nextWagonId,
    type,
    level: init.level ?? 1,
    machines: [],
    status: 'leer',
    crankUntil: 0,
  };
  state.nextWagonId += 1;
  state.wagons.push(w);
  addMachine(state, w, init);
  return w;
}

/** Maschine ohne Kosten in einen Wagen stellen */
export function addMachine(state: GameState, wagon: WagonState, init: { recipe?: RecipeId; resource?: ItemId } = {}): MachineState {
  const m: MachineState = {
    id: state.nextMachineId,
    recipe: init.recipe ?? null,
    resource: init.resource ?? null,
    progress: 0,
    cycleActive: false,
    status: 'leer',
  };
  state.nextMachineId += 1;
  wagon.machines.push(m);
  return m;
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
