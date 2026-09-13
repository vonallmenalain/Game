import { BALANCE } from './balance';
import { PROJECT_BY_ID, RECIPE_BY_ID, TECH_BY_ID, wagon as wagonDef } from './data';
import {
  addToStore,
  currentLoco,
  findWagon,
  getStore,
  hasSelfLoader,
  isProjectUnlocked,
  isRecipeUnlocked,
  isResourceDiscovered,
  isTechDone,
  isWagonTypeUnlocked,
  storeCap,
  takeFromStore,
} from './state';
import type { GameState, ItemId, RecipeId, Stack, TechId, WagonState, WagonType } from './types';

export type ActionErrorCode =
  | 'unbekannt'
  | 'wagen_gesperrt'
  | 'kein_platz'
  | 'material_fehlt'
  | 'stufe_max'
  | 'nicht_aufstufbar'
  | 'rezept_gesperrt'
  | 'rezept_falscher_wagen'
  | 'rohstoff_unbekannt'
  | 'forschung_laeuft'
  | 'forschung_fertig'
  | 'voraussetzung_fehlt'
  | 'warteschlange_voll'
  | 'projekt_gesperrt';

export type ActionResult = { ok: true } | { ok: false; code: ActionErrorCode; missing?: Stack[] };

const OK: ActionResult = { ok: true };

function fail(code: ActionErrorCode, missing?: Stack[]): ActionResult {
  return missing && missing.length > 0 ? { ok: false, code, missing } : { ok: false, code };
}

// Kosten

export function missingFor(state: GameState, cost: Stack[]): Stack[] {
  const missing: Stack[] = [];
  for (const s of cost) {
    const have = getStore(state, s.item);
    if (have < s.amount) missing.push({ item: s.item, amount: s.amount - have });
  }
  return missing;
}

export function canAfford(state: GameState, cost: Stack[]): boolean {
  return missingFor(state, cost).length === 0;
}

function pay(state: GameState, cost: Stack[]): void {
  for (const s of cost) takeFromStore(state, s.item, s.amount);
}

export function wagonBuildCost(type: WagonType): Stack[] {
  return wagonDef(type).cost.map((s) => ({ ...s }));
}

/** Kosten für die Stufe `nextLevel`: nextLevel-mal die Baukosten ohne Fahrgestell */
export function wagonUpgradeCost(type: WagonType, nextLevel: number): Stack[] {
  return wagonDef(type)
    .cost.filter((s) => s.item !== 'fahrgestell')
    .map((s) => ({ item: s.item, amount: s.amount * nextLevel }));
}

export function detachRefund(type: WagonType): Stack[] {
  return wagonDef(type)
    .cost.map((s) => ({ item: s.item, amount: Math.floor(s.amount * BALANCE.detachRefund) }))
    .filter((s) => s.amount > 0);
}

// Wagen

export interface WagonInit {
  recipe?: RecipeId;
  resource?: ItemId;
}

export function buildWagon(state: GameState, type: WagonType, init: WagonInit = {}): ActionResult {
  if (!isWagonTypeUnlocked(state, type)) return fail('wagen_gesperrt');
  if (state.wagons.length >= currentLoco(state).slots) return fail('kein_platz');
  const cost = wagonBuildCost(type);
  const missing = missingFor(state, cost);
  if (missing.length > 0) return fail('material_fehlt', missing);
  pay(state, cost);

  const w: WagonState = {
    id: state.nextWagonId,
    type,
    level: 1,
    recipe: null,
    resource: null,
    progress: 0,
    cycleActive: false,
    status: 'leer',
    crankUntil: 0,
  };
  state.nextWagonId += 1;
  state.wagons.push(w);

  if (type === 'ernte') {
    const resource = init.resource ?? 'eisenerz';
    if (isResourceDiscovered(state, resource)) w.resource = resource;
  } else if (type !== 'lager' && init.recipe) {
    const r = RECIPE_BY_ID[init.recipe];
    if (r && r.wagon === type && isRecipeUnlocked(state, r.id)) w.recipe = r.id;
  }
  return OK;
}

export function setRecipe(state: GameState, wagonId: number, recipeId: RecipeId | null): ActionResult {
  const w = findWagon(state, wagonId);
  if (!w || w.type === 'ernte' || w.type === 'lager') return fail('unbekannt');
  if (recipeId === null) {
    w.recipe = null;
    w.progress = 0;
    w.cycleActive = false;
    w.status = 'leer';
    return OK;
  }
  const r = RECIPE_BY_ID[recipeId];
  if (!r) return fail('unbekannt');
  if (r.wagon !== w.type) return fail('rezept_falscher_wagen');
  if (!isRecipeUnlocked(state, r.id)) return fail('rezept_gesperrt');
  if (w.recipe === r.id) return OK;
  w.recipe = r.id;
  w.progress = 0;
  w.cycleActive = false;
  return OK;
}

export function setResource(state: GameState, wagonId: number, item: ItemId): ActionResult {
  const w = findWagon(state, wagonId);
  if (!w || w.type !== 'ernte') return fail('unbekannt');
  if (!isResourceDiscovered(state, item)) return fail('rohstoff_unbekannt');
  if (w.resource === item) return OK;
  w.resource = item;
  w.progress = 0;
  return OK;
}

export function upgradeWagon(state: GameState, wagonId: number): ActionResult {
  const w = findWagon(state, wagonId);
  if (!w) return fail('unbekannt');
  if (!wagonDef(w.type).upgradable) return fail('nicht_aufstufbar');
  if (w.level >= BALANCE.maxLevel) return fail('stufe_max');
  const cost = wagonUpgradeCost(w.type, w.level + 1);
  const missing = missingFor(state, cost);
  if (missing.length > 0) return fail('material_fehlt', missing);
  pay(state, cost);
  w.level += 1;
  return OK;
}

export function detachWagon(state: GameState, wagonId: number): ActionResult {
  const index = state.wagons.findIndex((w) => w.id === wagonId);
  if (index < 0) return fail('unbekannt');
  const w = state.wagons[index]!;
  state.wagons.splice(index, 1);
  for (const s of detachRefund(w.type)) addToStore(state, s.item, s.amount);
  return OK;
}

export function moveWagon(state: GameState, wagonId: number, toIndex: number): ActionResult {
  const from = state.wagons.findIndex((w) => w.id === wagonId);
  if (from < 0) return fail('unbekannt');
  const target = Math.max(0, Math.min(state.wagons.length - 1, Math.floor(toIndex)));
  if (target === from) return OK;
  const [w] = state.wagons.splice(from, 1);
  state.wagons.splice(target, 0, w!);
  return OK;
}

// Forschung

export function canResearch(state: GameState, techId: TechId): ActionResult {
  const def = TECH_BY_ID[techId];
  if (!def) return fail('unbekannt');
  if (isTechDone(state, techId)) return fail('forschung_fertig');
  if (state.techs.current) return fail('forschung_laeuft');
  if (!def.requires.every((t) => isTechDone(state, t))) return fail('voraussetzung_fehlt');
  if (def.requiresBiome && !state.discoveredBiomes.includes(def.requiresBiome)) return fail('voraussetzung_fehlt');
  if (def.requiresProject && !state.projects[def.requiresProject]?.done) return fail('voraussetzung_fehlt');
  const missing = missingFor(state, [def.cost]);
  if (missing.length > 0) return fail('material_fehlt', missing);
  return OK;
}

/** Voraussetzungen erfüllt, unabhängig von Blaupausen und laufender Forschung */
export function isTechAvailable(state: GameState, techId: TechId): boolean {
  const def = TECH_BY_ID[techId];
  if (!def || isTechDone(state, techId)) return false;
  if (!def.requires.every((t) => isTechDone(state, t))) return false;
  if (def.requiresBiome && !state.discoveredBiomes.includes(def.requiresBiome)) return false;
  if (def.requiresProject && !state.projects[def.requiresProject]?.done) return false;
  return true;
}

export function startResearch(state: GameState, techId: TechId): ActionResult {
  const check = canResearch(state, techId);
  if (!check.ok) return check;
  const def = TECH_BY_ID[techId]!;
  pay(state, [def.cost]);
  state.techs.current = { id: techId, progress: 0 };
  return OK;
}

// Werkstatt

export function queueWorkbench(state: GameState, recipeId: RecipeId): ActionResult {
  const r = RECIPE_BY_ID[recipeId];
  if (!r) return fail('unbekannt');
  if (!isRecipeUnlocked(state, r.id)) return fail('rezept_gesperrt');
  if (state.workbench.queue.length >= BALANCE.workbenchQueueMax) return fail('warteschlange_voll');
  state.workbench.queue.push(r.id);
  return OK;
}

export function clearWorkbench(state: GameState): ActionResult {
  state.workbench.queue = [];
  state.workbench.progress = 0;
  state.workbench.cycleActive = false;
  return OK;
}

export function crank(state: GameState, wagonId: number): ActionResult {
  const w = findWagon(state, wagonId);
  if (!w || w.type !== 'ernte') return fail('unbekannt');
  if (!w.resource || !isResourceDiscovered(state, w.resource)) return fail('rohstoff_unbekannt');
  if (hasSelfLoader(state)) {
    const space = storeCap(state) - getStore(state, w.resource);
    addToStore(state, w.resource, Math.min(BALANCE.crankBonusItems, Math.max(0, space)));
    return OK;
  }
  const now = state.playedSeconds;
  const extended = Math.max(w.crankUntil, now) + BALANCE.crankSeconds;
  w.crankUntil = Math.min(extended, now + BALANCE.crankMaxAheadSeconds);
  return OK;
}

export function shovelCoal(state: GameState): ActionResult {
  const space = storeCap(state) - getStore(state, 'kohle');
  addToStore(state, 'kohle', Math.min(BALANCE.shovelCoal, Math.max(0, space)));
  return OK;
}

// Baustellen

export function setProjectPaused(state: GameState, projectId: string, paused: boolean): ActionResult {
  const st = state.projects[projectId];
  if (!st || !PROJECT_BY_ID[projectId]) return fail('unbekannt');
  if (!isProjectUnlocked(state, projectId)) return fail('projekt_gesperrt');
  st.paused = paused;
  return OK;
}
