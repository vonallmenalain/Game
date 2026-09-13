import { BALANCE } from './balance';
import { BIOMES, BIOME_BY_ID, ITEMS, PROJECTS, PROJECT_BY_ID, RECIPE_BY_ID, TECH_BY_ID, WAGON_BY_TYPE, loco as locoDef, recipesForWagon } from './data';
import type { BiomeDef, GameState, ItemId, LocoDef, ProjectId, ProjectState, RecipeDef, TechEffect, TechId, WagonState, WagonType } from './types';

export const STATE_VERSION = 1;

export function createInitialState(): GameState {
  const store: Record<ItemId, number> = {};
  for (const def of ITEMS) store[def.id] = 0;
  for (const [id, amount] of Object.entries(BALANCE.startStore)) store[id] = amount;

  const projects: Record<ProjectId, ProjectState> = {};
  for (const def of PROJECTS) projects[def.id] = { delivered: {}, done: false, paused: false, doneAt: null };

  const firstWagon: WagonState = {
    id: 1,
    type: 'ernte',
    level: 1,
    recipe: null,
    resource: 'eisenerz',
    progress: 0,
    cycleActive: false,
    status: 'wartet',
    crankUntil: 0,
  };

  return {
    version: STATE_VERSION,
    playedSeconds: 0,
    lastSavedAt: 0,
    pos: 0,
    km: 0,
    moveBudgetKm: 0,
    fuelDebt: 0,
    stop: 'faehrt',
    loco: 'dampflok',
    nextWagonId: 2,
    wagons: [firstWagon],
    store,
    discoveredBiomes: ['tal'],
    reachedObstacles: [],
    techs: { done: [], current: null },
    projects,
    workbench: { queue: [], progress: 0, cycleActive: false },
    log: [{ at: 0, km: 0, kind: 'start', ref: 'linie_null' }],
    stats: { produced: {}, consumed: {}, stoppedSeconds: 0 },
    warnings: [],
    standEnde: false,
  };
}

// Lager

export function getStore(state: GameState, item: ItemId): number {
  return state.store[item] ?? 0;
}

export function addToStore(state: GameState, item: ItemId, amount: number): void {
  if (amount <= 0) return;
  state.store[item] = getStore(state, item) + amount;
  state.stats.produced[item] = (state.stats.produced[item] ?? 0) + amount;
}

export function takeFromStore(state: GameState, item: ItemId, amount: number): void {
  if (amount <= 0) return;
  state.store[item] = getStore(state, item) - amount;
  state.stats.consumed[item] = (state.stats.consumed[item] ?? 0) + amount;
}

export function lagerwagenCount(state: GameState): number {
  return state.wagons.filter((w) => w.type === 'lager').length;
}

export function storeCap(state: GameState): number {
  return BALANCE.storeBaseCap + BALANCE.storeCapPerLagerwagen * lagerwagenCount(state);
}

// Technologien und ihre Wirkung

export function isTechDone(state: GameState, id: TechId): boolean {
  return state.techs.done.includes(id);
}

export function activeEffects(state: GameState): TechEffect[] {
  const effects: TechEffect[] = [];
  for (const id of state.techs.done) {
    const def = TECH_BY_ID[id];
    if (def) effects.push(...def.effects);
  }
  return effects;
}

export function hasSelfLoader(state: GameState): boolean {
  return activeEffects(state).some((e) => e.kind === 'selbstlader');
}

export function harvestMultiplier(state: GameState): number {
  let bonus = 0;
  for (const e of activeEffects(state)) if (e.kind === 'ernte_bonus') bonus += e.value;
  return 1 + bonus;
}

export function wagonTypeMultiplier(state: GameState, type: WagonType): number {
  let bonus = 0;
  for (const e of activeEffects(state)) if (e.kind === 'wagen_tempo' && e.wagon === type) bonus += e.value;
  return 1 + bonus;
}

export function levelMultiplier(level: number): number {
  return 1 + BALANCE.levelSpeedStep * (level - 1);
}

export function offlineCapSeconds(state: GameState): number {
  let hours: number = BALANCE.offlineCapHoursBase;
  for (const e of activeEffects(state)) if (e.kind === 'offline_deckel' && e.hours > hours) hours = e.hours;
  return hours * 3600;
}

export function isWagonTypeUnlocked(state: GameState, type: WagonType): boolean {
  const def = WAGON_BY_TYPE[type];
  if (!def) return false;
  return def.tech === null || isTechDone(state, def.tech);
}

export function isRecipeUnlocked(state: GameState, recipeId: string): boolean {
  const def = RECIPE_BY_ID[recipeId];
  if (!def) return false;
  return def.techs.every((t) => isTechDone(state, t));
}

export function unlockedRecipesFor(state: GameState, type: WagonType): RecipeDef[] {
  return recipesForWagon(type).filter((r) => isRecipeUnlocked(state, r.id));
}

export function isProjectUnlocked(state: GameState, projectId: ProjectId): boolean {
  const def = PROJECT_BY_ID[projectId];
  if (!def || def.preview || def.tech === null) return false;
  return isTechDone(state, def.tech);
}

export function projectProgress(state: GameState, projectId: ProjectId): number {
  const def = PROJECT_BY_ID[projectId];
  const st = state.projects[projectId];
  if (!def || !st) return 0;
  if (st.done) return 1;
  let total = 0;
  let have = 0;
  for (const line of def.bom) {
    total += line.amount;
    have += Math.min(line.amount, st.delivered[line.item] ?? 0);
  }
  return total === 0 ? 0 : have / total;
}

// Zug und Welt

export function currentLoco(state: GameState): LocoDef {
  return locoDef(state.loco);
}

export function freeSlots(state: GameState): number {
  return currentLoco(state).slots - state.wagons.length;
}

export function findWagon(state: GameState, wagonId: number): WagonState | undefined {
  return state.wagons.find((w) => w.id === wagonId);
}

export function hasWagonOfType(state: GameState, type: WagonType): boolean {
  return state.wagons.some((w) => w.type === type);
}

export function currentBiome(state: GameState): BiomeDef {
  let best: BiomeDef | undefined;
  for (const id of state.discoveredBiomes) {
    const def = BIOME_BY_ID[id];
    if (def && (!best || def.startKm > best.startKm)) best = def;
  }
  return best ?? BIOMES[0]!;
}

export function discoveredResources(state: GameState): ItemId[] {
  const seen = new Set<ItemId>();
  const out: ItemId[] = [];
  for (const biome of BIOMES) {
    if (!state.discoveredBiomes.includes(biome.id)) continue;
    for (const res of biome.resources) {
      if (!seen.has(res)) {
        seen.add(res);
        out.push(res);
      }
    }
  }
  return out;
}

export function isResourceDiscovered(state: GameState, item: ItemId): boolean {
  return discoveredResources(state).includes(item);
}

export function log(state: GameState, kind: GameState['log'][number]['kind'], ref: string): void {
  state.log.push({ at: state.playedSeconds, km: state.km, kind, ref });
  if (state.log.length > 200) state.log.splice(0, state.log.length - 200);
}
