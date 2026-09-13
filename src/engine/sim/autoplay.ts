/**
 * Autospieler: spielt den ersten Stand mit einer einfachen, aktiven Strategie durch.
 * Dient dem Sackgassen-Test und als Messlatte fürs Balancing. Kein Zufall, keine Oberfläche.
 */
import { ITEMS, ITEM_BY_ID, PROJECTS, RECIPE_BY_ID, TECHS, producerOf } from '../data';
import {
  buildWagon,
  canAfford,
  clearWorkbench,
  crank,
  detachWagon,
  isTechAvailable,
  missingFor,
  queueWorkbench,
  setRecipe,
  setResource,
  shovelCoal,
  startResearch,
  upgradeWagon,
  wagonBuildCost,
  wagonUpgradeCost,
} from '../actions';
import { BALANCE } from '../balance';
import {
  createInitialState,
  currentBiome,
  currentLoco,
  discoveredResources,
  getStore,
  harvestMultiplier,
  hasSelfLoader,
  isProjectUnlocked,
  isRecipeUnlocked,
  isTechDone,
  isWagonTypeUnlocked,
  levelMultiplier,
  storeCap,
  unlockedRecipesFor,
  wagonTypeMultiplier,
} from '../state';
import { tick, workbenchStalled } from '../tick';
import type { GameState, ItemId, RecipeDef, TechId, WagonState, WagonType } from '../types';

export interface AutoplayOptions {
  maxSeconds: number;
  stepSeconds?: number;
  decisionEverySeconds?: number;
  stopAt?: 'tunnel' | 'stand_ende' | 'none';
}

export interface AutoplayEvent {
  name: string;
  at: number;
  km: number;
}

export interface AutoplayResult {
  state: GameState;
  events: AutoplayEvent[];
  seconds: number;
  reachedTunnel: boolean;
}

const TECH_PRIORITY: TechId[] = [
  'selbstlader',
  'schmelzwagen',
  'werkwagen',
  'walzwagen',
  'konstruktionsbuero',
  'lagerwagen',
  'erntetechnik1',
  'stahlwerk',
  'teerofen',
  'brueckenbau',
  'schwere_dampflok',
  'schmelztechnik1',
  'nachtschicht1',
  'kupferhuette',
  'chemiewagen',
  'bohrtechnik',
  'walztechnik1',
  'erntetechnik2',
  'wuestenausruestung',
];

const PHASE_A: WagonType[] = ['ernte', 'schmelz', 'ernte', 'werk', 'walz', 'schmelz', 'buero', 'schmelz'];
const PHASE_B: WagonType[] = [...PHASE_A, 'lager', 'ernte', 'schmelz', 'ernte'];
const PHASE_C: WagonType[] = ['ernte', 'schmelz', 'ernte', 'werk', 'walz', 'schmelz', 'buero', 'ernte', 'lager', 'schmelz', 'ernte', 'chemie'];

const UPGRADE_ORDER: WagonType[] = ['ernte', 'schmelz', 'walz', 'werk', 'buero', 'chemie'];

/** Fertigungstiefe je Ware: Rohstoffe 0, sonst 1 plus tiefste Zutat */
const DEPTH: Record<ItemId, number> = {};
function depthOf(item: ItemId): number {
  const known = DEPTH[item];
  if (known !== undefined) return known;
  const r = producerOf(item);
  if (!r) {
    DEPTH[item] = 0;
    return 0;
  }
  DEPTH[item] = -1; // Schutz vor Zyklen
  const d = 1 + Math.max(0, ...r.inputs.map((s) => depthOf(s.item)));
  DEPTH[item] = d;
  return d;
}
const ITEMS_BY_DEPTH_DESC = [...ITEMS].sort((a, b) => depthOf(b.id) - depthOf(a.id));

function desiredComposition(state: GameState): WagonType[] {
  if (isTechDone(state, 'chemiewagen')) return PHASE_C;
  if (currentLoco(state).slots >= 12) return PHASE_B;
  return PHASE_A;
}

function countByType(wagons: WagonState[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const w of wagons) counts[w.type] = (counts[w.type] ?? 0) + 1;
  return counts;
}

function harvestRatePerMinute(state: GameState, w: WagonState, item: ItemId): number {
  const def = ITEM_BY_ID[item];
  if (!def) return 0;
  const onSite = def.homeBiomes?.includes(currentBiome(state).id) ? BALANCE.onSiteBonus : 1;
  return (def.harvestPerMinute ?? 0) * levelMultiplier(w.level) * harvestMultiplier(state) * onSite;
}

interface Plan {
  nextTech: TechId | null;
  upcomingTechs: TechId[];
  nextBuild: WagonType | null;
}

export function planGoals(state: GameState): Plan {
  const upcoming = TECH_PRIORITY.filter((id) => !isTechDone(state, id));
  const nextTech = upcoming.find((id) => isTechAvailable(state, id)) ?? null;

  const desired = desiredComposition(state);
  const want = countByType(desired.map((type) => ({ type }) as WagonState));
  const have = countByType(state.wagons);
  let nextBuild: WagonType | null = null;
  for (const type of desired) {
    if ((have[type] ?? 0) < (want[type] ?? 0) && isWagonTypeUnlocked(state, type)) {
      nextBuild = type;
      break;
    }
    if ((have[type] ?? 0) < (want[type] ?? 0)) continue;
  }
  return { nextTech, upcomingTechs: upcoming.slice(0, 3), nextBuild };
}

export function computeDemand(state: GameState, plan: Plan): Record<ItemId, number> {
  const demand: Record<ItemId, number> = {};
  const add = (item: ItemId, qty: number) => {
    if (qty > 0) demand[item] = (demand[item] ?? 0) + qty;
  };
  const cap = storeCap(state);
  const loco = currentLoco(state);

  if (!state.standEnde) add('schienen', cap);
  add(loco.fuel, 120);
  for (const item of discoveredResources(state)) add(item, 60);
  for (const r of Object.values(RECIPE_BY_ID)) {
    if (!isRecipeUnlocked(state, r.id)) continue;
    for (const o of r.outputs) if (ITEM_BY_ID[o.item]?.kind === 'ware') add(o.item, 40);
  }
  for (const id of plan.upcomingTechs) {
    const def = TECHS.find((t) => t.id === id);
    if (def) add(def.cost.item, def.cost.amount);
  }
  if (plan.nextBuild) for (const s of wagonBuildCost(plan.nextBuild)) add(s.item, s.amount);
  for (const def of PROJECTS) {
    const st = state.projects[def.id];
    if (!st || st.done || st.paused || !isProjectUnlocked(state, def.id)) continue;
    for (const line of def.bom) add(line.item, line.amount - (st.delivered[line.item] ?? 0));
  }

  // Bedarf an Zutaten weiterreichen, tiefe Waren zuerst
  for (const def of ITEMS_BY_DEPTH_DESC) {
    const deficit = (demand[def.id] ?? 0) - getStore(state, def.id);
    if (deficit <= 0) continue;
    const r = producerOf(def.id);
    if (!r || !isRecipeUnlocked(state, r.id)) continue;
    const outAmount = r.outputs.find((o) => o.item === def.id)?.amount ?? 1;
    for (const s of r.inputs) add(s.item, (deficit * s.amount) / outAmount);
  }
  return demand;
}

function assignHarvesters(state: GameState, demand: Record<ItemId, number>): void {
  const harvesters = state.wagons.filter((w) => w.type === 'ernte');
  if (harvesters.length === 0) return;
  const resources = discoveredResources(state);
  const cap = storeCap(state);
  const deficit: Record<ItemId, number> = {};
  for (const r of resources) deficit[r] = Math.max(0, Math.min(demand[r] ?? 0, cap) - getStore(state, r));

  const horizonMinutes = 10;
  const scoreOf = (w: WagonState, r: ItemId) => (deficit[r] ?? 0) / Math.max(1, harvestRatePerMinute(state, w, r));

  for (const w of harvesters) {
    let best: ItemId | null = null;
    let bestScore = 0;
    for (const r of resources) {
      const s = scoreOf(w, r);
      if (s > bestScore) {
        bestScore = s;
        best = r;
      }
    }
    const current = w.resource && resources.includes(w.resource) ? w.resource : null;
    let target: ItemId;
    if (best) {
      const keep = current !== null && scoreOf(w, current) >= 0.6 * bestScore;
      target = keep && current ? current : best;
    } else if (current && getStore(state, current) < cap) {
      target = current;
    } else {
      // Nichts fehlt: den am wenigsten gefüllten Rohstoff nehmen
      target = [...resources].sort((a, b) => getStore(state, a) - getStore(state, b))[0] ?? 'eisenerz';
    }
    if (w.resource !== target) setResource(state, w.id, target);
    deficit[target] = Math.max(0, (deficit[target] ?? 0) - harvestRatePerMinute(state, w, target) * horizonMinutes);
  }
}

function recipeScore(state: GameState, r: RecipeDef, demand: Record<ItemId, number>, cap: number): number {
  let score = 0;
  for (const o of r.outputs) score += (Math.max(0, Math.min(demand[o.item] ?? 0, cap) - getStore(state, o.item)) * o.amount) / r.seconds;
  const inputsReady = r.inputs.every((s) => getStore(state, s.item) >= s.amount);
  return inputsReady ? score : score * 0.3;
}

const PRODUCTION_TYPES: WagonType[] = ['schmelz', 'walz', 'werk', 'buero', 'chemie'];

function assignProduction(state: GameState, demand: Record<ItemId, number>, memory: BotMemory): void {
  const horizonSeconds = 60;
  const cap = storeCap(state);
  for (const w of state.wagons) {
    if (w.type === 'ernte' || w.type === 'lager') continue;
    const candidates = unlockedRecipesFor(state, w.type);
    if (candidates.length === 0) continue;
    let best: RecipeDef | null = null;
    let bestScore = -1;
    for (const r of candidates) {
      const s = recipeScore(state, r, demand, cap);
      if (s > bestScore) {
        bestScore = s;
        best = r;
      }
    }
    if (!best) continue;
    const current = w.recipe ? RECIPE_BY_ID[w.recipe] : undefined;
    const keep = current && recipeScore(state, current, demand, cap) >= 0.7 * bestScore;
    const target = keep && current ? current : best;
    if (w.recipe !== target.id) setRecipe(state, w.id, target.id);
    const speed = levelMultiplier(w.level) * wagonTypeMultiplier(state, w.type);
    for (const o of target.outputs) {
      const produced = ((o.amount * speed) / target.seconds) * horizonSeconds;
      demand[o.item] = Math.max(0, (demand[o.item] ?? 0) - produced);
    }
  }
  coverStarved(state, demand, cap, memory);
}

/** Gedächtnis des Autospielers über Entscheidungen hinweg */
interface BotMemory {
  starvedSince: Record<string, number>;
}

/**
 * Schutz vor Verhungern: Hat ein Rezept seit fünf Minuten Bedarf, liegt seine Ware bei null
 * und kocht sie niemand, bekommt es den entbehrlichsten Wagen seines Typs.
 */
function coverStarved(state: GameState, demand: Record<ItemId, number>, cap: number, memory: BotMemory): void {
  const patience = 300;
  for (const type of PRODUCTION_TYPES) {
    const wagons = state.wagons.filter((w) => w.type === type);
    if (wagons.length < 2) continue;
    const counts: Record<string, number> = {};
    for (const w of wagons) if (w.recipe) counts[w.recipe] = (counts[w.recipe] ?? 0) + 1;
    let candidate: RecipeDef | null = null;
    let candidateScore = 0;
    for (const r of unlockedRecipesFor(state, type)) {
      const starved = !counts[r.id] && r.outputs.every((o) => getStore(state, o.item) === 0) && recipeScore(state, r, demand, cap) > 0;
      if (!starved) {
        delete memory.starvedSince[r.id];
        continue;
      }
      const since = memory.starvedSince[r.id] ?? state.playedSeconds;
      memory.starvedSince[r.id] = since;
      if (state.playedSeconds - since < patience) continue;
      const score = recipeScore(state, r, demand, cap);
      if (score > candidateScore) {
        candidateScore = score;
        candidate = r;
      }
    }
    if (!candidate) continue;
    const redundant = [...wagons].reverse().find((w) => w.recipe && (counts[w.recipe] ?? 0) > 1) ?? wagons[wagons.length - 1]!;
    setRecipe(state, redundant.id, candidate.id);
    delete memory.starvedSince[candidate.id];
  }
}

function planWorkbench(state: GameState, plan: Plan): void {
  if (state.workbench.queue.length > 0) {
    if (!workbenchStalled(state)) return;
    clearWorkbench(state);
  }
  const consumed: Record<ItemId, number> = {};
  const produced: Record<ItemId, number> = {};
  const queue: string[] = [];
  const max = BALANCE.workbenchQueueMax;
  const available = (item: ItemId) => getStore(state, item) - (consumed[item] ?? 0) + (produced[item] ?? 0);

  const craft = (item: ItemId, qty: number, depth: number): void => {
    if (queue.length >= max || depth > 6 || qty <= 0) return;
    const r = producerOf(item);
    if (!r || !isRecipeUnlocked(state, r.id)) return;
    const outAmount = r.outputs.find((o) => o.item === item)?.amount ?? 1;
    const runs = Math.min(Math.ceil(qty / outAmount), max - queue.length);
    for (const s of r.inputs) {
      const need = runs * s.amount - available(s.item);
      if (need > 0) craft(s.item, need, depth + 1);
    }
    for (let i = 0; i < runs && queue.length < max; i += 1) {
      queue.push(r.id);
      for (const s of r.inputs) consumed[s.item] = (consumed[s.item] ?? 0) + s.amount;
      for (const o of r.outputs) produced[o.item] = (produced[o.item] ?? 0) + o.amount;
    }
  };

  const goals: { item: ItemId; amount: number }[] = [];
  if (plan.nextTech) {
    const def = TECHS.find((t) => t.id === plan.nextTech);
    if (def) goals.push(...missingFor(state, [def.cost]));
  }
  if (plan.nextBuild) goals.push(...missingFor(state, wagonBuildCost(plan.nextBuild)));
  for (const g of goals) craft(g.item, g.amount, 0);

  for (const id of queue) queueWorkbench(state, id);
}

function tryUpgrades(state: GameState): void {
  for (const type of UPGRADE_ORDER) {
    for (const w of state.wagons) {
      if (w.type !== type || w.level >= BALANCE.maxLevel) continue;
      const cost = wagonUpgradeCost(w.type, w.level + 1);
      const surplus = cost.every((s) => getStore(state, s.item) >= s.amount * 2);
      if (surplus && upgradeWagon(state, w.id).ok) return;
    }
  }
}

function tryBuild(state: GameState, plan: Plan): void {
  if (!plan.nextBuild) return;
  const loco = currentLoco(state);
  if (state.wagons.length >= loco.slots) {
    const desired = desiredComposition(state);
    const want = countByType(desired.map((type) => ({ type }) as WagonState));
    const have = countByType(state.wagons);
    const surplusTypes = Object.keys(have).filter((t) => (have[t] ?? 0) > (want[t] ?? 0));
    const victim = [...state.wagons].reverse().find((w) => surplusTypes.includes(w.type));
    if (!victim) return;
    detachWagon(state, victim.id);
  }
  if (!canAfford(state, wagonBuildCost(plan.nextBuild))) return;
  const init = plan.nextBuild === 'ernte' ? { resource: 'kohle' } : {};
  buildWagon(state, plan.nextBuild, init);
}

function decide(state: GameState, memory: BotMemory): void {
  const selfLoader = hasSelfLoader(state);
  if (!selfLoader) {
    for (const w of state.wagons) if (w.type === 'ernte') crank(state, w.id);
  }
  const hasCoalHarvester = state.wagons.some((w) => w.type === 'ernte' && w.resource === 'kohle');
  if (!hasCoalHarvester && getStore(state, 'kohle') < 40) {
    for (let i = 0; i < 3; i += 1) shovelCoal(state);
  }

  const plan = planGoals(state);
  if (!state.techs.current && plan.nextTech) startResearch(state, plan.nextTech);

  tryBuild(state, plan);
  const demand = computeDemand(state, planGoals(state));
  assignHarvesters(state, demand);
  assignProduction(state, demand, memory);
  planWorkbench(state, planGoals(state));
  tryUpgrades(state);
}

export function autoplay(options: AutoplayOptions): AutoplayResult {
  const state = createInitialState();
  const step = options.stepSeconds ?? 1;
  const every = options.decisionEverySeconds ?? 5;
  const stopAt = options.stopAt ?? 'tunnel';
  const events: AutoplayEvent[] = [];
  let logSeen = 0;
  let sinceDecision = every;
  let elapsed = 0;
  const memory: BotMemory = { starvedSince: {} };

  while (elapsed < options.maxSeconds) {
    if (sinceDecision >= every) {
      decide(state, memory);
      sinceDecision = 0;
    }
    tick(state, step);
    elapsed += step;
    sinceDecision += step;
    while (logSeen < state.log.length) {
      const e = state.log[logSeen]!;
      events.push({ name: `${e.kind}:${e.ref}`, at: e.at, km: e.km });
      logSeen += 1;
    }
    if (stopAt === 'tunnel' && state.projects['tunnel']?.done) break;
    if (stopAt === 'stand_ende' && state.standEnde) break;
  }

  return { state, events, seconds: elapsed, reachedTunnel: state.projects['tunnel']?.done === true };
}
