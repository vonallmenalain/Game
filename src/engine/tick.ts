import { BALANCE } from './balance';
import { BIOMES, OBSTACLES, PROJECTS, RECIPE_BY_ID, TECH_BY_ID, item as itemDef } from './data';
import {
  addToStore,
  currentBiome,
  currentLoco,
  discoveredResources,
  getStore,
  harvestMultiplier,
  hasSelfLoader,
  hasWagonOfType,
  isProjectUnlocked,
  isRecipeUnlocked,
  levelMultiplier,
  log,
  storeCap,
  takeFromStore,
  wagonTypeMultiplier,
} from './state';
import type { BiomeDef, GameState, ItemId, RecipeDef, Stack, StopReason, WagonState, WagonStatus, WagonType, Warning } from './types';

interface TickContext {
  cap: number;
  selfLoader: boolean;
  harvestMul: number;
  typeMul: Record<string, number>;
  biome: BiomeDef;
  discovered: Set<ItemId>;
  hasBuero: boolean;
}

const WAGON_TYPES: WagonType[] = ['ernte', 'schmelz', 'walz', 'werk', 'buero', 'lager', 'chemie'];

function buildContext(state: GameState): TickContext {
  const typeMul: Record<string, number> = {};
  for (const type of WAGON_TYPES) typeMul[type] = wagonTypeMultiplier(state, type);
  return {
    cap: storeCap(state),
    selfLoader: hasSelfLoader(state),
    harvestMul: harvestMultiplier(state),
    typeMul,
    biome: currentBiome(state),
    discovered: new Set(discoveredResources(state)),
    hasBuero: hasWagonOfType(state, 'buero'),
  };
}

/**
 * Ein Zeitschritt der Simulation. Reihenfolge wie im Konzept, Abschnitt 14.2:
 * Ernte, Rezepte, Werkbank, Baustellen, Forschung, Bewegung, Warnungen.
 */
export function tick(state: GameState, dt: number): void {
  if (!(dt > 0)) return;
  state.playedSeconds += dt;
  const ctx = buildContext(state);
  tickHarvest(state, dt, ctx);
  tickProduction(state, dt, ctx);
  tickWorkbench(state, dt, ctx);
  tickProjects(state);
  tickResearch(state, dt, ctx);
  tickMovement(state, dt);
  collectWarnings(state);
}

// 1. Ernte

function tickHarvest(state: GameState, dt: number, ctx: TickContext): void {
  for (const w of state.wagons) {
    if (w.type !== 'ernte') continue;
    if (!w.resource || !ctx.discovered.has(w.resource)) {
      w.status = 'leer';
      continue;
    }
    const active = ctx.selfLoader || w.crankUntil > state.playedSeconds;
    if (!active) {
      w.status = 'wartet';
      continue;
    }
    if (getStore(state, w.resource) >= ctx.cap) {
      w.status = 'blockiert';
      continue;
    }
    const def = itemDef(w.resource);
    const onSite = def.homeBiomes?.includes(ctx.biome.id) ? BALANCE.onSiteBonus : 1;
    const perSecond = ((def.harvestPerMinute ?? 0) / 60) * levelMultiplier(w.level) * ctx.harvestMul * onSite;
    w.progress += perSecond * dt;
    const whole = Math.floor(w.progress);
    if (whole > 0) {
      const space = Math.max(0, ctx.cap - getStore(state, w.resource));
      const add = Math.min(whole, space);
      addToStore(state, w.resource, add);
      w.progress -= add;
      if (w.progress > 1) w.progress = 1;
    }
    w.status = 'aktiv';
  }
}

// 2. Rezepte

function hasInputs(state: GameState, r: RecipeDef): boolean {
  return r.inputs.every((s) => getStore(state, s.item) >= s.amount);
}

function hasOutputRoom(state: GameState, r: RecipeDef, cap: number): boolean {
  return r.outputs.every((s) => getStore(state, s.item) < cap);
}

function supplies(prev: WagonState, r: RecipeDef): boolean {
  if (prev.type === 'ernte') return prev.resource !== null && r.inputs.some((s) => s.item === prev.resource);
  if (!prev.recipe) return false;
  const prevRecipe = RECIPE_BY_ID[prev.recipe];
  if (!prevRecipe) return false;
  return prevRecipe.outputs.some((o) => r.inputs.some((s) => s.item === o.item));
}

/** Ernterate eines Erntewagens in Stück pro Minute, mit Stufe, Technologie und Vor-Ort-Bonus */
export function harvestRatePerMinute(state: GameState, w: WagonState, resource: ItemId | null = w.resource): number {
  if (w.type !== 'ernte' || !resource) return 0;
  const def = itemDef(resource);
  const onSite = def.homeBiomes?.includes(currentBiome(state).id) ? BALANCE.onSiteBonus : 1;
  return (def.harvestPerMinute ?? 0) * levelMultiplier(w.level) * harvestMultiplier(state) * onSite;
}

/** Ob der Vor-Ort-Bonus für einen Rohstoff gerade gilt */
export function isOnSite(state: GameState, resource: ItemId): boolean {
  return itemDef(resource).homeBiomes?.includes(currentBiome(state).id) ?? false;
}

/** Zutaten, die für einen Zyklus fehlen */
export function missingInputs(state: GameState, r: RecipeDef): Stack[] {
  return r.inputs.filter((s) => getStore(state, s.item) < s.amount).map((s) => ({ item: s.item, amount: s.amount - getStore(state, s.item) }));
}

/** Tempo eines Produktionswagens als Faktor: Stufe, Technologie, Nachbarschaft */
export function productionSpeed(state: GameState, index: number): number {
  const w = state.wagons[index];
  if (!w || !w.recipe) return 0;
  const r = RECIPE_BY_ID[w.recipe];
  if (!r) return 0;
  const prev = index > 0 ? state.wagons[index - 1] : undefined;
  const neighbor = prev && supplies(prev, r) ? 1 + BALANCE.neighborBonus : 1;
  return levelMultiplier(w.level) * wagonTypeMultiplier(state, w.type) * neighbor;
}

interface CycleHolder {
  progress: number;
  cycleActive: boolean;
}

/**
 * Lässt ein Rezept für die gegebene Arbeitszeit laufen. Mehrere Zyklen je Schritt sind
 * erlaubt, damit das Ergebnis nicht vom Zeitschritt abhängt. Gibt den Status zurück.
 */
function runCycles(state: GameState, holder: CycleHolder, r: RecipeDef, work: number, cap: number): WagonStatus {
  let remaining = work;
  let guard = 0;
  while (remaining > 1e-9 && guard < 10000) {
    guard += 1;
    if (!holder.cycleActive) {
      if (!hasInputs(state, r)) return 'wartet';
      if (!hasOutputRoom(state, r, cap)) return 'blockiert';
      for (const s of r.inputs) takeFromStore(state, s.item, s.amount);
      holder.cycleActive = true;
      holder.progress = 0;
    }
    const need = r.seconds - holder.progress;
    if (remaining >= need) {
      remaining -= need;
      holder.progress = 0;
      holder.cycleActive = false;
      for (const s of r.outputs) addToStore(state, s.item, s.amount);
    } else {
      holder.progress += remaining;
      remaining = 0;
    }
  }
  return 'aktiv';
}

function tickProduction(state: GameState, dt: number, ctx: TickContext): void {
  for (let i = 0; i < state.wagons.length; i += 1) {
    const w = state.wagons[i]!;
    if (w.type === 'ernte') continue;
    if (w.type === 'lager') {
      w.status = 'aktiv';
      continue;
    }
    if (!w.recipe) {
      w.status = 'leer';
      continue;
    }
    const r = RECIPE_BY_ID[w.recipe];
    if (!r || r.wagon !== w.type || !isRecipeUnlocked(state, r.id)) {
      w.status = 'leer';
      continue;
    }
    const prev = i > 0 ? state.wagons[i - 1] : undefined;
    const neighbor = prev && supplies(prev, r) ? 1 + BALANCE.neighborBonus : 1;
    const speed = levelMultiplier(w.level) * (ctx.typeMul[w.type] ?? 1) * neighbor;
    w.status = runCycles(state, w, r, dt * speed, ctx.cap);
  }
}

// 3. Werkbank

/**
 * Die Werkbank arbeitet nicht blockierend: Der erste Auftrag, dessen Zutaten da sind,
 * kommt an die Reihe. So kann ein Auftrag weiter hinten die Zutat für einen weiter vorne liefern.
 */
function tickWorkbench(state: GameState, dt: number, ctx: TickContext): void {
  const wb = state.workbench;
  let remaining = dt;
  let guard = 0;
  while (remaining > 1e-9 && wb.queue.length > 0 && guard < 1000) {
    guard += 1;
    if (!wb.cycleActive) {
      let runnable = -1;
      for (let i = 0; i < wb.queue.length; i += 1) {
        const r = RECIPE_BY_ID[wb.queue[i]!];
        if (!r || !isRecipeUnlocked(state, r.id)) {
          wb.queue.splice(i, 1);
          i -= 1;
          continue;
        }
        if (hasInputs(state, r) && hasOutputRoom(state, r, ctx.cap)) {
          runnable = i;
          break;
        }
      }
      if (runnable < 0) break;
      if (runnable > 0) {
        const [entry] = wb.queue.splice(runnable, 1);
        wb.queue.unshift(entry!);
      }
      const r = RECIPE_BY_ID[wb.queue[0]!]!;
      for (const s of r.inputs) takeFromStore(state, s.item, s.amount);
      wb.cycleActive = true;
      wb.progress = 0;
    }
    const r = RECIPE_BY_ID[wb.queue[0]!];
    if (!r) {
      wb.queue.shift();
      wb.cycleActive = false;
      wb.progress = 0;
      continue;
    }
    const need = r.seconds - wb.progress;
    if (remaining >= need) {
      remaining -= need;
      for (const s of r.outputs) addToStore(state, s.item, s.amount);
      wb.progress = 0;
      wb.cycleActive = false;
      wb.queue.shift();
    } else {
      wb.progress += remaining;
      remaining = 0;
    }
  }
  if (wb.queue.length === 0) {
    wb.progress = 0;
    wb.cycleActive = false;
  }
}

/** Ob die Werkbank gerade weiterkommt oder alle Aufträge auf Zutaten warten */
export function workbenchStalled(state: GameState): boolean {
  const wb = state.workbench;
  if (wb.queue.length === 0 || wb.cycleActive) return false;
  const cap = storeCap(state);
  return !wb.queue.some((id) => {
    const r = RECIPE_BY_ID[id];
    return r && isRecipeUnlocked(state, r.id) && hasInputs(state, r) && hasOutputRoom(state, r, cap);
  });
}

// 4. Baustellen

function tickProjects(state: GameState): void {
  for (const def of PROJECTS) {
    const st = state.projects[def.id];
    if (!st || st.done || st.paused || def.preview) continue;
    if (!isProjectUnlocked(state, def.id)) continue;
    let complete = true;
    for (const line of def.bom) {
      const have = st.delivered[line.item] ?? 0;
      const need = line.amount - have;
      if (need <= 0) continue;
      const take = Math.min(need, Math.floor(getStore(state, line.item)));
      if (take > 0) {
        takeFromStore(state, line.item, take);
        st.delivered[line.item] = have + take;
      }
      if (have + take < line.amount) complete = false;
    }
    if (!complete) continue;
    st.done = true;
    st.doneAt = state.playedSeconds;
    log(state, 'projekt', def.id);
    if (def.kind === 'lok' && def.loco) {
      state.loco = def.loco;
      log(state, 'lok', def.loco);
    }
    if (def.kind === 'hindernis') discoverBiomes(state);
  }
}

// 5. Forschung

function tickResearch(state: GameState, dt: number, ctx: TickContext): void {
  const current = state.techs.current;
  if (!current) return;
  const def = TECH_BY_ID[current.id];
  if (!def) {
    state.techs.current = null;
    return;
  }
  current.progress += dt * (ctx.hasBuero ? 1 : BALANCE.workbenchResearchFactor);
  if (current.progress < def.seconds) return;
  state.techs.done.push(def.id);
  state.techs.current = null;
  log(state, 'forschung', def.id);
  if (def.effects.some((e) => e.kind === 'stand_ende')) {
    state.standEnde = true;
    log(state, 'stand_ende', def.id);
  }
}

// 6. Bewegung

function blockingObstacleAt(state: GameState, pos: number) {
  return OBSTACLES.find((o) => o.km * BALANCE.railsPerKm === pos && !state.projects[o.project]?.done);
}

function discoverBiomes(state: GameState): void {
  for (const biome of BIOMES) {
    if (biome.preview || state.discoveredBiomes.includes(biome.id)) continue;
    const startPos = biome.startKm * BALANCE.railsPerKm;
    if (state.pos < startPos) continue;
    if (state.pos === startPos && blockingObstacleAt(state, startPos)) continue;
    state.discoveredBiomes.push(biome.id);
    log(state, 'biom', biome.id);
  }
}

function noteObstacleReached(state: GameState): void {
  const obstacle = blockingObstacleAt(state, state.pos);
  if (!obstacle || state.reachedObstacles.includes(obstacle.id)) return;
  state.reachedObstacles.push(obstacle.id);
  log(state, 'hindernis', obstacle.id);
}

function tickMovement(state: GameState, dt: number): void {
  const lk = currentLoco(state);
  const segKm = 1 / BALANCE.railsPerKm;
  state.moveBudgetKm += (lk.speedKmh / 3600) * dt;

  let moved = false;
  let reason: StopReason = 'faehrt';
  let guard = 0;
  while (state.moveBudgetKm >= segKm - 1e-12 && guard < 100000) {
    guard += 1;
    if (blockingObstacleAt(state, state.pos)) {
      reason = 'hindernis';
      break;
    }
    if (getStore(state, 'schienen') < 1) {
      reason = 'schienen';
      break;
    }
    const debt = state.fuelDebt + lk.fuelPerKm * segKm;
    const units = Math.floor(debt + 1e-9);
    if (getStore(state, lk.fuel) < Math.max(1, units)) {
      reason = 'brennstoff';
      break;
    }
    state.fuelDebt = debt - units;
    if (units > 0) takeFromStore(state, lk.fuel, units);
    takeFromStore(state, 'schienen', 1);
    state.pos += 1;
    state.km = state.pos / BALANCE.railsPerKm;
    state.moveBudgetKm -= segKm;
    moved = true;
    discoverBiomes(state);
    noteObstacleReached(state);
  }

  if (reason !== 'faehrt') {
    state.stop = reason;
    state.moveBudgetKm = Math.min(state.moveBudgetKm, segKm);
    state.stats.stoppedSeconds += dt;
    if (reason === 'hindernis') noteObstacleReached(state);
  } else if (moved) {
    state.stop = 'faehrt';
  }
}

// 7. Warnungen

function outputItemOf(w: WagonState): ItemId | undefined {
  if (w.type === 'ernte') return w.resource ?? undefined;
  if (!w.recipe) return undefined;
  return RECIPE_BY_ID[w.recipe]?.outputs[0]?.item;
}

function collectWarnings(state: GameState): void {
  const warnings: Warning[] = [];
  const lk = currentLoco(state);
  if (state.stop === 'schienen') warnings.push({ code: 'schienen_leer', item: 'schienen' });
  if (state.stop === 'brennstoff') warnings.push({ code: 'brennstoff_leer', item: lk.fuel });
  if (state.stop !== 'faehrt') warnings.push({ code: 'zug_steht' });
  for (const w of state.wagons) {
    if (w.status === 'blockiert') warnings.push({ code: 'lager_voll', item: outputItemOf(w), wagonId: w.id });
    else if (w.status === 'wartet') warnings.push({ code: w.type === 'ernte' ? 'handkurbel' : 'zutat_fehlt', wagonId: w.id });
  }
  state.warnings = warnings;
}
