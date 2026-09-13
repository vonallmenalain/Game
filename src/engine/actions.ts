import { BALANCE } from './balance';
import { planCraft } from './craft';
import { PROJECT_BY_ID, RECIPE_BY_ID, TECH_BY_ID, wagon as wagonDef } from './data';
import {
  addToStore,
  currentLoco,
  findMachine,
  findWagon,
  freeMachineSlots,
  getStore,
  hasSelfLoader,
  isProjectUnlocked,
  isRecipeUnlocked,
  isResourceDiscovered,
  isTechDone,
  isWagonTypeUnlocked,
  storeCap,
  takeFromStore,
  wagonOfType,
} from './state';
import type { GameState, ItemId, MachineState, RecipeId, Stack, TechId, WagonState, WagonType } from './types';

export type ActionErrorCode =
  | 'unbekannt'
  | 'wagen_gesperrt'
  | 'wagen_schon_da'
  | 'kein_platz'
  | 'wagen_voll'
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
  | 'letzte_maschine'
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

/**
 * Kosten der Maschine mit der Nummer `index` (1-basiert). Die erste Maschine steckt
 * in den Baukosten des Wagens, gefragt wird also ab Nummer 2. Jede weitere kostet
 * einen halben Grundpreis mehr als die davor.
 */
export function machineBuildCost(type: WagonType, index: number): Stack[] {
  const factor = 1 + BALANCE.machineCostStep * (Math.max(1, index) - 1);
  return wagonDef(type).machineCost.map((s) => ({ item: s.item, amount: Math.ceil(s.amount * factor) }));
}

/** Kosten der nächsten Maschine in diesem Wagen */
export function nextMachineCost(wagon: WagonState): Stack[] {
  return machineBuildCost(wagon.type, wagon.machines.length + 1);
}

export function machineRefund(wagon: WagonState): Stack[] {
  return machineBuildCost(wagon.type, wagon.machines.length)
    .map((s) => ({ item: s.item, amount: Math.floor(s.amount * BALANCE.detachRefund) }))
    .filter((s) => s.amount > 0);
}

/** Kosten für die Stufe `nextLevel`: nextLevel-mal die Baukosten ohne Fahrgestell */
export function wagonUpgradeCost(type: WagonType, nextLevel: number): Stack[] {
  return wagonDef(type)
    .cost.filter((s) => s.item !== 'fahrgestell')
    .map((s) => ({ item: s.item, amount: s.amount * nextLevel }));
}

/** Was das Abkoppeln zurückgibt: der Wagen und alle Maschinen ab der zweiten */
export function detachRefund(wagon: WagonState): Stack[] {
  const sum: Record<ItemId, number> = {};
  const add = (cost: Stack[]) => {
    for (const s of cost) sum[s.item] = (sum[s.item] ?? 0) + s.amount;
  };
  add(wagonDef(wagon.type).cost);
  for (let i = 2; i <= wagon.machines.length; i += 1) add(machineBuildCost(wagon.type, i));
  return Object.entries(sum)
    .map(([item, amount]) => ({ item, amount: Math.floor(amount * BALANCE.detachRefund) }))
    .filter((s) => s.amount > 0);
}

// Wagen und Maschinen

export interface MachineInit {
  recipe?: RecipeId;
  resource?: ItemId;
}

function newMachine(state: GameState): MachineState {
  const m: MachineState = {
    id: state.nextMachineId,
    recipe: null,
    resource: null,
    progress: 0,
    cycleActive: false,
    status: 'leer',
  };
  state.nextMachineId += 1;
  return m;
}

/** Auftrag einer frischen Maschine setzen, ohne Fehler zu melden: Was nicht geht, bleibt leer. */
function applyInit(state: GameState, wagon: WagonState, m: MachineState, init: MachineInit): void {
  if (wagon.type === 'ernte') {
    const resource = init.resource ?? 'eisenerz';
    if (isResourceDiscovered(state, resource)) m.resource = resource;
    return;
  }
  if (wagon.type === 'lager' || !init.recipe) return;
  const r = RECIPE_BY_ID[init.recipe];
  if (r && r.wagon === wagon.type && isRecipeUnlocked(state, r.id)) m.recipe = r.id;
}

/**
 * Hängt einen Wagen an. Von jedem Typ gibt es genau einen: Der Wagen ist die Abteilung,
 * ausgebaut wird er mit Maschinen. Die erste Maschine steckt in den Baukosten.
 */
export function buildWagon(state: GameState, type: WagonType, init: MachineInit = {}): ActionResult {
  if (!isWagonTypeUnlocked(state, type)) return fail('wagen_gesperrt');
  if (wagonOfType(state, type)) return fail('wagen_schon_da');
  if (state.wagons.length >= currentLoco(state).slots) return fail('kein_platz');
  const cost = wagonBuildCost(type);
  const missing = missingFor(state, cost);
  if (missing.length > 0) return fail('material_fehlt', missing);
  pay(state, cost);

  const w: WagonState = {
    id: state.nextWagonId,
    type,
    level: 1,
    machines: [],
    status: 'leer',
    crankUntil: 0,
  };
  state.nextWagonId += 1;
  state.wagons.push(w);

  const m = newMachine(state);
  applyInit(state, w, m, init);
  w.machines.push(m);
  return OK;
}

/** Baut eine weitere Maschine in den Wagen. Sie wird teurer, je mehr schon drinstehen. */
export function buildMachine(state: GameState, wagonId: number, init: MachineInit = {}): ActionResult {
  const w = findWagon(state, wagonId);
  if (!w) return fail('unbekannt');
  if (freeMachineSlots(state, w) <= 0) return fail('wagen_voll');
  const cost = nextMachineCost(w);
  const missing = missingFor(state, cost);
  if (missing.length > 0) return fail('material_fehlt', missing);
  pay(state, cost);
  const m = newMachine(state);
  applyInit(state, w, m, init);
  w.machines.push(m);
  return OK;
}

/** Baut eine Maschine aus. Der letzte Platz im Wagen bleibt besetzt, sonst wäre der Wagen leer. */
export function removeMachine(state: GameState, wagonId: number, machineId: number): ActionResult {
  const w = findWagon(state, wagonId);
  if (!w) return fail('unbekannt');
  const index = w.machines.findIndex((m) => m.id === machineId);
  if (index < 0) return fail('unbekannt');
  if (w.machines.length <= 1) return fail('letzte_maschine');
  for (const s of machineRefund(w)) addToStore(state, s.item, s.amount);
  w.machines.splice(index, 1);
  return OK;
}

export function setMachineRecipe(state: GameState, wagonId: number, machineId: number, recipeId: RecipeId | null): ActionResult {
  const w = findWagon(state, wagonId);
  const m = findMachine(state, wagonId, machineId);
  if (!w || !m || w.type === 'ernte' || w.type === 'lager') return fail('unbekannt');
  if (recipeId === null) {
    m.recipe = null;
    m.progress = 0;
    m.cycleActive = false;
    m.status = 'leer';
    return OK;
  }
  const r = RECIPE_BY_ID[recipeId];
  if (!r) return fail('unbekannt');
  if (r.wagon !== w.type) return fail('rezept_falscher_wagen');
  if (!isRecipeUnlocked(state, r.id)) return fail('rezept_gesperrt');
  if (m.recipe === r.id) return OK;
  m.recipe = r.id;
  m.progress = 0;
  m.cycleActive = false;
  return OK;
}

/**
 * Nimmt einer Maschine den Auftrag, ohne sie auszubauen. Sie bleibt im Wagen stehen
 * und verbraucht nichts, der Platz und das Material bleiben bezahlt.
 */
export function pauseMachine(state: GameState, wagonId: number, machineId: number): ActionResult {
  const w = findWagon(state, wagonId);
  const m = findMachine(state, wagonId, machineId);
  if (!w || !m || w.type === 'lager') return fail('unbekannt');
  m.recipe = null;
  m.resource = null;
  m.progress = 0;
  m.cycleActive = false;
  m.status = 'leer';
  return OK;
}

export function setMachineResource(state: GameState, wagonId: number, machineId: number, item: ItemId): ActionResult {
  const w = findWagon(state, wagonId);
  const m = findMachine(state, wagonId, machineId);
  if (!w || !m || w.type !== 'ernte') return fail('unbekannt');
  if (!isResourceDiscovered(state, item)) return fail('rohstoff_unbekannt');
  if (m.resource === item) return OK;
  m.resource = item;
  m.progress = 0;
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
  for (const s of detachRefund(w)) addToStore(state, s.item, s.amount);
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

/**
 * Reiht ein Rezept ein und stellt fehlende Zwischenprodukte davor. Wer Eisenbarren
 * will und keinen Koks hat, bekommt zuerst Koks in die Warteschlange.
 */
export function queueCraftChain(state: GameState, recipeId: RecipeId): ActionResult {
  const r = RECIPE_BY_ID[recipeId];
  if (!r) return fail('unbekannt');
  if (!isRecipeUnlocked(state, r.id)) return fail('rezept_gesperrt');

  const plan = planCraft(state, recipeId);
  if (plan.missing.length > 0) return fail('material_fehlt', plan.missing);

  const frei = BALANCE.workbenchQueueMax - state.workbench.queue.length;
  if (plan.orders > frei) return fail('warteschlange_voll');

  for (const step of plan.steps) {
    for (let i = 0; i < step.runs; i += 1) state.workbench.queue.push(step.recipe);
  }
  return OK;
}

export function clearWorkbench(state: GameState): ActionResult {
  state.workbench.queue = [];
  state.workbench.progress = 0;
  state.workbench.cycleActive = false;
  return OK;
}

/** Die Kurbel sitzt am Wagen und treibt alle Erntemaschinen darin an. */
export function crank(state: GameState, wagonId: number): ActionResult {
  const w = findWagon(state, wagonId);
  if (!w || w.type !== 'ernte') return fail('unbekannt');
  const resources = w.machines.map((m) => m.resource).filter((r): r is ItemId => r !== null && isResourceDiscovered(state, r));
  if (resources.length === 0) return fail('rohstoff_unbekannt');
  if (hasSelfLoader(state)) {
    const cap = storeCap(state);
    for (const resource of resources) {
      const space = cap - getStore(state, resource);
      addToStore(state, resource, Math.min(BALANCE.crankBonusItems, Math.max(0, space)));
    }
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
