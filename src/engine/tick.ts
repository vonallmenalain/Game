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
import type { BiomeDef, GameState, ItemId, MachineState, RecipeDef, Stack, StopReason, WagonState, WagonStatus, WagonType, Warning } from './types';

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
    const active = ctx.selfLoader || w.crankUntil > state.playedSeconds;
    for (const m of w.machines) {
      if (!m.resource || !ctx.discovered.has(m.resource)) {
        m.status = 'leer';
        continue;
      }
      if (!active) {
        m.status = 'wartet';
        continue;
      }
      if (getStore(state, m.resource) >= ctx.cap) {
        m.status = 'blockiert';
        continue;
      }
      const def = itemDef(m.resource);
      const onSite = def.homeBiomes?.includes(ctx.biome.id) ? BALANCE.onSiteBonus : 1;
      const perSecond = ((def.harvestPerMinute ?? 0) / 60) * levelMultiplier(w.level) * ctx.harvestMul * onSite;
      m.progress += perSecond * dt;
      const whole = Math.floor(m.progress);
      if (whole > 0) {
        const space = Math.max(0, ctx.cap - getStore(state, m.resource));
        const add = Math.min(whole, space);
        addToStore(state, m.resource, add);
        m.progress -= add;
        if (m.progress > 1) m.progress = 1;
      }
      m.status = 'aktiv';
    }
    w.status = summarize(w);
  }
}

/**
 * Der Wagen zeigt den besten Stand seiner Maschinen: Läuft eine, läuft der Wagen.
 * Sonst zählt die dringlichste Meldung, damit nichts unter den Tisch fällt.
 */
function summarize(w: WagonState): WagonStatus {
  if (w.machines.length === 0) return 'leer';
  if (w.machines.some((m) => m.status === 'aktiv')) return 'aktiv';
  if (w.machines.some((m) => m.status === 'blockiert')) return 'blockiert';
  if (w.machines.some((m) => m.status === 'wartet')) return 'wartet';
  return 'leer';
}

// 2. Rezepte

function hasInputs(state: GameState, r: RecipeDef): boolean {
  return r.inputs.every((s) => getStore(state, s.item) >= s.amount);
}

function hasOutputRoom(state: GameState, r: RecipeDef, cap: number): boolean {
  return r.outputs.every((s) => getStore(state, s.item) < cap);
}

/** Liefert diese Maschine eine Zutat für das Rezept? */
function supplies(m: MachineState, r: RecipeDef): boolean {
  if (m.resource !== null) return r.inputs.some((s) => s.item === m.resource);
  if (!m.recipe) return false;
  const other = RECIPE_BY_ID[m.recipe];
  if (!other) return false;
  return other.outputs.some((o) => r.inputs.some((s) => s.item === o.item));
}

/** Kurze Wege: Eine Maschine im selben Wagen liefert eine Zutat */
function shortPath(wagon: WagonState, self: MachineState, r: RecipeDef): boolean {
  return wagon.machines.some((m) => m !== self && supplies(m, r));
}

/** Ernterate einer Erntemaschine in Stück pro Minute, mit Stufe, Technologie und Vor-Ort-Bonus */
export function harvestRatePerMinute(state: GameState, w: WagonState, resource: ItemId | null): number {
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

/** Tempo einer Maschine als Faktor: Stufe des Wagens, Technologie, kurze Wege */
export function machineSpeed(state: GameState, w: WagonState, m: MachineState): number {
  if (!m.recipe) return 0;
  const r = RECIPE_BY_ID[m.recipe];
  if (!r) return 0;
  const neighbor = shortPath(w, m, r) ? 1 + BALANCE.neighborBonus : 1;
  return levelMultiplier(w.level) * wagonTypeMultiplier(state, w.type) * neighbor;
}

/** Grundtempo eines Wagens ohne kurze Wege */
export function wagonBaseSpeed(state: GameState, w: WagonState): number {
  return levelMultiplier(w.level) * wagonTypeMultiplier(state, w.type);
}

/**
 * Ob eine Maschine gerade arbeiten kann. Fehlende Zutaten zählen hier nicht: Eine
 * Maschine, die auf Nachschub wartet, ist eingeteilt und zählt weiter. So zeigt das
 * Minus im Lager, dass die Kette mehr verlangt, als sie liefert.
 */
function canRun(state: GameState, w: WagonState, m: MachineState, cap: number, selfLoader: boolean): boolean {
  if (w.type === 'ernte') {
    if (!m.resource) return false;
    if (!selfLoader && w.crankUntil <= state.playedSeconds) return false;
    return getStore(state, m.resource) < cap;
  }
  const r = m.recipe ? RECIPE_BY_ID[m.recipe] : undefined;
  return Boolean(r && hasOutputRoom(state, r, cap));
}

export function machineCanRun(state: GameState, w: WagonState, m: MachineState): boolean {
  return canRun(state, w, m, storeCap(state), hasSelfLoader(state));
}

/**
 * Was eine Maschine gerade pro Minute liefert: die Ernterate oder die erste Ausgabe
 * ihres Rezepts. Null, sobald sie nicht arbeiten kann, also ohne Auftrag, ohne Kurbel
 * oder mit vollem Ausgabelager. Daneben steht immer der Status, der den Grund nennt.
 */
export function machineRatePerMinute(state: GameState, w: WagonState, m: MachineState): number {
  if (!machineCanRun(state, w, m)) return 0;
  if (w.type === 'ernte') return harvestRatePerMinute(state, w, m.resource);
  const r = m.recipe ? RECIPE_BY_ID[m.recipe] : undefined;
  const out = r?.outputs[0];
  if (!r || !out) return 0;
  return (out.amount / r.seconds) * 60 * machineSpeed(state, w, m);
}

/**
 * Was der Zug pro Minute bewegt, je Ware Herstellung minus Verbrauch. Gerechnet aus
 * dem, was gerade eingestellt ist, nicht gemessen über die letzte Minute: So schlägt
 * jede Änderung sofort durch, und die Zahl zittert nicht im Takt der Rezepte.
 *
 * Was nicht laufen kann, zählt nicht: eine Erntemaschine ohne Kurbel und eine Maschine,
 * deren Ausgabelager voll ist. Fehlen dagegen nur Zutaten, zählt die Maschine weiter.
 * Genau dann zeigt das Minus, dass die Kette mehr verlangt, als sie liefert.
 */
export function flowPerMinute(state: GameState): Record<ItemId, number> {
  const flow: Record<ItemId, number> = {};
  const add = (item: ItemId, amount: number) => {
    flow[item] = (flow[item] ?? 0) + amount;
  };
  const cap = storeCap(state);
  const selfLoader = hasSelfLoader(state);

  for (const w of state.wagons) {
    for (const m of w.machines) {
      if (!canRun(state, w, m, cap, selfLoader)) continue;
      if (w.type === 'ernte') {
        add(m.resource!, harvestRatePerMinute(state, w, m.resource));
        continue;
      }
      const r = RECIPE_BY_ID[m.recipe!]!;
      const cyclesPerMinute = (60 / r.seconds) * machineSpeed(state, w, m);
      for (const o of r.outputs) add(o.item, o.amount * cyclesPerMinute);
      for (const i of r.inputs) add(i.item, -i.amount * cyclesPerMinute);
    }
  }

  // Die Werkbank arbeitet einen Auftrag mit einfachem Tempo
  const head = state.workbench.queue[0] ? RECIPE_BY_ID[state.workbench.queue[0]] : undefined;
  if (head && hasOutputRoom(state, head, cap)) {
    const cyclesPerMinute = 60 / head.seconds;
    for (const o of head.outputs) add(o.item, o.amount * cyclesPerMinute);
    for (const i of head.inputs) add(i.item, -i.amount * cyclesPerMinute);
  }

  // Die Fahrt frisst Schienen und Brennstoff
  if (state.stop === 'faehrt') {
    const lk = currentLoco(state);
    const kmPerMinute = lk.speedKmh / 60;
    add('schienen', -kmPerMinute * BALANCE.railsPerKm);
    add(lk.fuel, -kmPerMinute * lk.fuelPerKm);
  }

  return flow;
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
  for (const w of state.wagons) {
    if (w.type === 'ernte') continue;
    if (w.type === 'lager') {
      for (const m of w.machines) m.status = 'aktiv';
      w.status = w.machines.length > 0 ? 'aktiv' : 'leer';
      continue;
    }
    for (const m of w.machines) {
      if (!m.recipe) {
        m.status = 'leer';
        continue;
      }
      const r = RECIPE_BY_ID[m.recipe];
      if (!r || r.wagon !== w.type || !isRecipeUnlocked(state, r.id)) {
        m.status = 'leer';
        continue;
      }
      const speed = levelMultiplier(w.level) * (ctx.typeMul[w.type] ?? 1) * (shortPath(w, m, r) ? 1 + BALANCE.neighborBonus : 1);
      m.status = runCycles(state, m, r, dt * speed, ctx.cap);
    }
    w.status = summarize(w);
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

/**
 * Forscht mit der Arbeitszeit dieses Schritts. Wird eine Technologie fertig, rückt die
 * nächste aus der Warteschlange nach, notfalls mehrmals: Über Nacht liegt sonst die
 * halbe Warteschlange brach, obwohl sie längst bezahlt ist.
 */
function tickResearch(state: GameState, dt: number, ctx: TickContext): void {
  /** Die nächste aus der Warteschlange aufziehen, damit nie eine Lücke entsteht */
  const nachruecken = () => {
    if (state.techs.current) return;
    const next = state.techs.queue.shift();
    if (next) state.techs.current = { id: next, progress: 0 };
  };

  nachruecken();
  let remaining = dt * (ctx.hasBuero ? 1 : BALANCE.workbenchResearchFactor);
  let guard = 0;
  while (remaining > 1e-9 && state.techs.current && guard < 1000) {
    guard += 1;
    const current = state.techs.current;
    const def = TECH_BY_ID[current.id];
    if (!def) {
      state.techs.current = null;
      nachruecken();
      continue;
    }
    const need = def.seconds - current.progress;
    if (remaining < need) {
      current.progress += remaining;
      return;
    }
    remaining -= need;
    state.techs.done.push(def.id);
    state.techs.current = null;
    log(state, 'forschung', def.id);
    if (def.effects.some((e) => e.kind === 'stand_ende')) {
      state.standEnde = true;
      log(state, 'stand_ende', def.id);
    }
    nachruecken();
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

function outputItemOf(m: MachineState): ItemId | undefined {
  if (m.resource) return m.resource;
  if (!m.recipe) return undefined;
  return RECIPE_BY_ID[m.recipe]?.outputs[0]?.item;
}

function collectWarnings(state: GameState): void {
  const warnings: Warning[] = [];
  const lk = currentLoco(state);
  if (state.stop === 'schienen') warnings.push({ code: 'schienen_leer', item: 'schienen' });
  if (state.stop === 'brennstoff') warnings.push({ code: 'brennstoff_leer', item: lk.fuel });
  if (state.stop !== 'faehrt') warnings.push({ code: 'zug_steht' });
  // Je Ware und Grund nur eine Meldung: Zehn blockierte Maschinen sind ein Problem, nicht zehn.
  const seen = new Set<string>();
  for (const w of state.wagons) {
    for (const m of w.machines) {
      const code = m.status === 'blockiert' ? 'lager_voll' : m.status === 'wartet' ? (w.type === 'ernte' ? 'handkurbel' : 'zutat_fehlt') : null;
      if (!code) continue;
      const item = code === 'lager_voll' ? outputItemOf(m) : undefined;
      const key = `${code}/${item ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      warnings.push({ code, item, wagonId: w.id, machineId: m.id });
    }
  }
  state.warnings = warnings;
}
