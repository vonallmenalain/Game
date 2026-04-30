import { BUILDING_BY_TYPE } from "./buildings";
import { RECIPES, RECIPE_BY_ID } from "./recipes";
import { TECHS } from "./techs";
import { BuildingType, GameState, Stack } from "./types";

const BASE_MINING_RATE = 0.5;

const hasStacks = (inv: GameState["inventory"], stacks: Stack[]) => stacks.every((s) => inv[s.id] >= s.amount);
const consume = (inv: GameState["inventory"], stacks: Stack[]) => stacks.forEach((s) => (inv[s.id] -= s.amount));
const produce = (inv: GameState["inventory"], stacks: Stack[]) => stacks.forEach((s) => (inv[s.id] += s.amount));

export function getTechStatus(state: GameState, techId: string) {
  if (state.researchedTechs.includes(techId)) return "researched";
  const tech = TECHS.find((t) => t.id === techId)!;
  return tech.requires.every((r) => state.researchedTechs.includes(r)) ? "available" : "locked";
}

export function tick(state: GameState, dt: number): GameState {
  const next: GameState = structuredClone(state);
  next.time += dt;
  next.power.produced = next.buildings.reduce((s, b) => s + (BUILDING_BY_TYPE[b.type].powerProduction ?? 0), 0);
  next.power.required = next.buildings.reduce((s, b) => s + BUILDING_BY_TYPE[b.type].powerUse, 0);
  next.power.efficiency = next.power.required > 0 ? Math.min(1, next.power.produced / next.power.required) : 1;

  for (const b of next.buildings) {
    if (b.type === "coal_generator") continue;
    if (b.type === "miner") {
      if (!b.minerTarget) continue;
      next.inventory[b.minerTarget] += BASE_MINING_RATE * next.modifiers.miningRate * dt * next.power.efficiency;
      b.status = next.power.efficiency < 1 ? "low_power" : "running";
      continue;
    }
    if (!b.recipeId) { b.status = "no_recipe"; continue; }
    const r = RECIPE_BY_ID[b.recipeId];
    if (!r || !next.unlockedRecipes.includes(r.id)) { b.status = "no_recipe"; continue; }
    const speedMod = b.type === "smelter" ? next.modifiers.smelterSpeed : 1;
    if (b.progress <= 0) {
      if (!hasStacks(next.inventory, r.inputs)) { b.status = "waiting"; continue; }
      consume(next.inventory, r.inputs); b.progress = r.duration;
    }
    b.progress -= dt * next.power.efficiency * speedMod;
    b.status = next.power.efficiency < 1 ? "low_power" : "running";
    if (b.progress <= 0) {
      produce(next.inventory, r.outputs);
      if (r.id === "red_matrix") { next.inventory.research_red += 5; next.inventory.research_points += 5; }
      if (r.id === "blue_matrix") { next.inventory.research_blue += 12; next.inventory.research_points += 12; }
      if (r.id === "yellow_matrix") next.inventory.research_points += 30;
      next.eventLog.unshift(`${r.name} +${r.outputs[0].amount} produziert`);
    }
  }
  next.eventLog = next.eventLog.slice(0, 10);
  return next;
}

export function buyBuilding(state: GameState, type: BuildingType): GameState {
  const def = BUILDING_BY_TYPE[type];
  if (!state.unlockedBuildings.includes(type) || !hasStacks(state.inventory, def.cost)) return state;
  const next = structuredClone(state); consume(next.inventory, def.cost);
  next.buildings.push({ id: `${type}_${next.buildings.length + 1}`, type, progress: 0, status: "no_recipe", minerTarget: type==="miner"?"iron_ore":undefined });
  next.eventLog.unshift(`${def.name} gebaut`); return next;
}

export function researchTech(state: GameState, techId: string): GameState {
  const tech = TECHS.find((t) => t.id === techId); if (!tech || getTechStatus(state, techId) !== "available" || state.inventory.research_points < tech.cost) return state;
  const next = structuredClone(state); next.inventory.research_points -= tech.cost; next.researchedTechs.push(techId);
  if (techId === "automation_1") next.unlockedBuildings.push("matrix_press");
  if (techId === "mining_1") next.modifiers.miningRate *= 1.25;
  if (techId === "smelting_1") next.modifiers.smelterSpeed *= 1.2;
  if (techId === "matrix_1") next.unlockedRecipes.push("red_matrix");
  if (techId === "silicon_processing") { next.unlockedMiningTargets.push("silicon_ore"); next.unlockedRecipes.push("silicon_ingot", "silicon_wafer"); }
  if (techId === "logic_systems") next.unlockedRecipes.push("logic_chip", "blue_matrix");
  next.eventLog.unshift(`${tech.name} erforscht`); return next;
}

export const recipesByBuilding = (type: BuildingType, unlocked: string[]) => RECIPES.filter(r=>r.building===type && unlocked.includes(r.id));
